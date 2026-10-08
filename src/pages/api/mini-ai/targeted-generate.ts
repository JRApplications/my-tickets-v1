import type { APIRoute } from "astro";

import { generateText, Output } from "ai";
import { GITHUB_SKILLS_TOKEN } from 'astro:env/server';

import { z } from "zod";

import { openAiClient } from "../aiUtils/aiClient";
import { captureError } from "../reportError";

import { getRegistry, getSkill, getTool } from "../sidebar-ai/lib/sidebar-ai/registry";

const AIModel = "gpt-5-mini";

const GITHUB_OWNER = "JRApplications";
const GITHUB_REPO = "my-tickets-skills";
const GITHUB_BRANCH = "main";

// ======================================================
// TYPES
// ======================================================

interface ToolResultRequest {
  mode: "tool-result";
  folder: string;
  tool: string;
  skill: string;
  subSkill?: string | null;
  toolResult: unknown;
}

// ======================================================
// ROUTER RESPONSE
// ======================================================

const RouteSchema = z.object({
  action: z.enum(["answer", "tool"]),
  skill: z.string().nullable(),
  subSkill: z.string().nullable(),
  tool: z.string().nullable(),
  response: z.string().nullable(),
});

type Route = z.infer<typeof RouteSchema>;

// ======================================================
// ARGUMENT PREPARATION RESPONSE
// ======================================================

const ArgumentPreparationSchema = z.object({
  status: z.enum(["ready", "missing_information"]),
  argumentsJson: z.string().nullable(),
  message: z.string().nullable(),
});

type ArgumentPreparation = z.infer<typeof ArgumentPreparationSchema>;

// ======================================================
// RESPONSE HELPERS
// ======================================================

const jsonHeaders = { "Content-Type": "application/json" };

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

// ======================================================
// VALIDATION
// ======================================================

const isValidToolName = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]+$/.test(value);

// Shared by skill IDs and folder paths: one or more lowercase,
// hyphenated segments separated by "/".
const isValidSlugPath = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(value);

// A skill/tool "belongs" to the target folder if its id is the
// folder itself or is nested under it.
const isWithinFolder = (id: string, folder: string): boolean =>
  id === folder || id.startsWith(`${folder}/`);

// ======================================================
// GITHUB SYSTEM FILES (folder-scoped)
// ======================================================

async function loadGithubFile(path: string): Promise<string> {
  const token = GITHUB_SKILLS_TOKEN;

  if (!token) {
    throw new Error("GITHUB_SKILLS_TOKEN is not configured");
  }

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.error(`Failed to load GitHub file ${path}:`, response.status, errorText);

    throw new Error(`GitHub file not found or unavailable: ${path}`);
  }

  const file = await response.json();

  if (file.type !== "file" || typeof file.content !== "string") {
    throw new Error(`GitHub path is not a valid file: ${path}`);
  }

  return Buffer.from(file.content, "base64").toString("utf-8");
}

async function loadSystemRules(): Promise<{ router: string; execution: string }> {
  const [router, execution] = await Promise.all([
    loadGithubFile("skills/_system/ROUTER.md"),
    loadGithubFile("skills/_system/EXECUTION.md"),
  ]);

  return { router, execution };
}

// ======================================================
// REGISTRY METADATA (filtered to the target folder)
// ======================================================

function buildRoutingMetadata(
  registry: Awaited<ReturnType<typeof getRegistry>>,
  folder: string,
): string {
  const skills = Object.values(registry.skills)
    .filter((skill: any) => isWithinFolder(skill.id, folder))
    .map((skill: any) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      tools: skill.tools,
      subSkills: skill.subSkills.map((subSkill: any) => ({
        id: subSkill.id,
        name: subSkill.name,
        description: subSkill.description,
      })),
    }));

  // Only expose tools actually declared by an in-scope skill, so a
  // folder can't reach tools that belong to a different folder.
  const toolNamesInScope = new Set(skills.flatMap((skill: any) => skill.tools ?? []));

  const tools = Object.values(registry.tools)
    .filter((tool: any) => toolNamesInScope.has(tool.name))
    .map((tool: any) => ({
      name: tool.name,
      description: tool.description ?? "",
      type: tool.type ?? null,
    }));

  return JSON.stringify({ skills, tools }, null, 2);
}

// ======================================================
// TOOL RESULT
// ======================================================

async function handleToolResult(body: Record<string, unknown>): Promise<Response> {
  const data = body as Partial<ToolResultRequest>;

  if (!isValidSlugPath(data.folder)) {
    return jsonResponse({ error: "A valid folder is required" }, 400);
  }

  if (!isValidToolName(data.tool)) {
    return jsonResponse({ error: "A valid tool is required" }, 400);
  }

  if (!isValidSlugPath(data.skill)) {
    return jsonResponse({ error: "A valid skill is required" }, 400);
  }

  if (!isWithinFolder(data.skill, data.folder)) {
    return jsonResponse({ error: `Skill is outside the target folder: ${data.skill}` }, 403);
  }

  if (!("toolResult" in data)) {
    return jsonResponse({ error: "toolResult is required" }, 400);
  }

  const { execution } = await loadSystemRules();

  const skill = await getSkill(data.skill);

  if (!skill) {
    return jsonResponse({ error: `Skill not found: ${data.skill}` }, 404);
  }

  const tool = await getTool(data.tool);

  if (!tool) {
    return jsonResponse({ error: `Tool not found: ${data.tool}` }, 404);
  }

  const result = await generateText({
    model: await openAiClient(AIModel),

    system: `
${execution}

---

# SELECTED SKILL

${skill.content}

---

# SELECTED TOOL

${tool.content}

---

# ACTUAL TOOL RESULT

${JSON.stringify(data.toolResult, null, 2)}
`,

    prompt: "Provide the final user-facing response based only on the actual tool result and the supplied instructions.",
  });

  return jsonResponse({
    text: result.text?.trim() || "The operation has completed.",
    folder: data.folder,
    skill: data.skill,
    subSkill: data.subSkill ?? null,
    tool: data.tool,
    ui: null,
  });
}

// ======================================================
// ARGUMENT PREPARATION
// ======================================================

async function prepareToolArguments(options: {
  prompt: string;
  skill: Awaited<ReturnType<typeof getSkill>>;
  tool: Awaited<ReturnType<typeof getTool>>;
}): Promise<ArgumentPreparation> {
  if (!options.skill || !options.tool) {
    throw new Error("Skill and tool are required for argument preparation");
  }

  const result = await generateText({
    model: await openAiClient(AIModel),

    output: Output.object({ schema: ArgumentPreparationSchema }),

    system: `
You are the argument-preparation layer for Sidebar AI.

Your job is to determine whether the user's request contains all information required to execute the selected tool.

You do not execute the tool.

You do not invent information.

You do not guess missing information.

You do not silently paraphrase or summarize user-provided information when the TOOL.md requires the user's wording to be used as provided.

If all required information is available:

- Return status = "ready".
- Return argumentsJson containing a valid JSON object.
- Return message = null.

If required information is missing:

- Return status = "missing_information".
- Return argumentsJson = null.
- Return a concise question asking the user for the missing information.

Do not ask for information that is already available in the current request.

The selected TOOL.md defines the required information and any tool-specific restrictions.

The selected SKILL.md may contain additional requirements.

Do not execute the tool.

---

# SELECTED SKILL

${options.skill.content}

---

# SELECTED TOOL

${options.tool.content}
`,

    prompt: `
# CURRENT USER REQUEST

${options.prompt}

Determine whether the tool can be executed with the information currently available.
`,
  });

  return result.output;
}

// ======================================================
// TOOL EXECUTION
// ======================================================

async function executeTool(options: {
  request: Request;
  auth: string;
  tool: string;
  arguments: Record<string, unknown>;
}): Promise<unknown> {
  const url = new URL("/api/sidebar-ai/tools/execute", options.request.url);

  const response = await fetch(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: options.auth,
    },

    body: JSON.stringify({ tool: options.tool, arguments: options.arguments }),
  });

  let result: unknown;

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    result = await response.json();
  } else {
    result = await response.text();
  }

  if (!response.ok) {
    throw new Error(`Tool execution failed with status ${response.status}: ${JSON.stringify(result)}`);
  }

  return result;
}

// ======================================================
// MAIN POST
// ======================================================

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // ------------------------------------------------
    // 1. Authorization
    // ------------------------------------------------

    const auth = request.headers.get("authorization");

    if (!auth) {
      return jsonResponse({ error: "authorization is required" }, 401);
    }

    // ------------------------------------------------
    // 2. Parse body
    // ------------------------------------------------

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const requestBody = body as Record<string, unknown>;

    // ------------------------------------------------
    // 3. Target folder
    // ------------------------------------------------

    if (!isValidSlugPath(requestBody.folder)) {
      return jsonResponse({ error: "A valid folder is required" }, 400);
    }

    const folder = requestBody.folder as string;

    // ------------------------------------------------
    // 4. Tool-result mode
    // ------------------------------------------------

    if (requestBody.mode === "tool-result") {
      return handleToolResult(requestBody);
    }

    // ------------------------------------------------
    // 5. Prompt
    // ------------------------------------------------

    if (typeof requestBody.prompt !== "string") {
      return jsonResponse({ error: "prompt is required" }, 400);
    }

    const prompt = requestBody.prompt.trim();

    if (!prompt) {
      return jsonResponse({ error: "prompt cannot be empty" }, 400);
    }

    // ------------------------------------------------
    // 6. Load registry
    // ------------------------------------------------

    const registry = await getRegistry();

    if (!registry) {
      throw new Error("Sidebar AI registry is unavailable");
    }

    // ------------------------------------------------
    // 7. Load system rules (global, not per-folder)
    // ------------------------------------------------

    const { router } = await loadSystemRules();

    // ------------------------------------------------
    // 8. Routing metadata (scoped to the folder)
    // ------------------------------------------------

    const routingMetadata = buildRoutingMetadata(registry, folder);

    // ------------------------------------------------
    // 9. Route
    // ------------------------------------------------

    const routeResult = await generateText({
      model: await openAiClient(AIModel),

      output: Output.object({ schema: RouteSchema }),

      system: `
${router}

---

# AVAILABLE SKILLS AND TOOLS

${routingMetadata}
`,

      prompt: `
# CURRENT USER REQUEST

${prompt}

Return the routing decision.
`,
    });

    const route = routeResult.output as Route;

    // ------------------------------------------------
    // 10. Normal answer
    // ------------------------------------------------

    if (route.action === "answer") {
      return jsonResponse({
        text: route.response?.trim() || "I’m not sure how to help with that.",
        folder,
        skill: route.skill,
        subSkill: route.subSkill,
        tool: null,
        arguments: {},
        ui: null,
      });
    }

    // ------------------------------------------------
    // 11. Validate selected tool
    // ------------------------------------------------

    if (!isValidToolName(route.tool)) {
      throw new Error(`AI selected invalid tool: ${route.tool}`);
    }

    // ------------------------------------------------
    // 12. Load trusted tool
    // ------------------------------------------------

    const tool = await getTool(route.tool);

    if (!tool) {
      throw new Error(`Selected tool is not available: ${route.tool}`);
    }

    // ------------------------------------------------
    // 13. Determine skill path (subSkill is already a full
    //     registry ID) and confirm it stays in-folder
    // ------------------------------------------------

    let skillPath: string | null = null;

    if (route.subSkill) {
      if (!isValidSlugPath(route.subSkill)) {
        throw new Error(`AI selected invalid sub-skill: ${route.subSkill}`);
      }

      skillPath = route.subSkill;
    } else if (route.skill) {
      if (!isValidSlugPath(route.skill)) {
        throw new Error(`AI selected invalid skill: ${route.skill}`);
      }

      skillPath = route.skill;
    }

    if (skillPath && !isWithinFolder(skillPath, folder)) {
      throw new Error(`AI selected a skill outside the target folder: ${skillPath}`);
    }

    // ------------------------------------------------
    // 14. Load trusted skill
    // ------------------------------------------------

    const skill = skillPath ? await getSkill(skillPath) : null;

    if (skillPath && !skill) {
      throw new Error(`Selected skill is not available: ${skillPath}`);
    }

    // ------------------------------------------------
    // 15. Verify tool belongs to skill
    // ------------------------------------------------

    if (
      skill &&
      Array.isArray(skill.tools) &&
      skill.tools.length > 0 &&
      !skill.tools.includes(tool.name)
    ) {
      throw new Error(`Tool ${tool.name} is not declared by skill ${skill.id}`);
    }

    // ------------------------------------------------
    // 16. Check for UI
    // ------------------------------------------------

    let ui = null;

    const uiUrl = new URL("/api/sidebar-ai/tools/ui", request.url);

    const uiResponse = await fetch(uiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },

      body: JSON.stringify({ tool: tool.name }),
    });

    if (uiResponse.ok) {
      const uiData = await uiResponse.json();

      ui = uiData.ui ?? null;
    } else {
      console.warn(`Could not load UI for tool ${tool.name}: ${uiResponse.status}`);
    }

    // ------------------------------------------------
    // 17. UI-backed tool — the UI collects the required
    //     information, so do not execute yet
    // ------------------------------------------------

    if (ui) {
      const title = ui.title?.trim() || tool.name;

      return jsonResponse({
        text: `Please provide the information required to ${title.toLowerCase()}.`,
        folder,
        skill: skill?.id ?? route.skill,
        subSkill: route.subSkill ?? null,
        tool: tool.name,
        arguments: {},
        ui,
      });
    }

    // ------------------------------------------------
    // 18. Prepare arguments for non-UI tool
    // ------------------------------------------------

    const prepared = await prepareToolArguments({ prompt, skill, tool });

    // ------------------------------------------------
    // 19. Missing information — ask the user and STOP
    // ------------------------------------------------

    if (prepared.status === "missing_information") {
      const message = prepared.message?.trim();

      if (!message) {
        throw new Error("Argument preparation reported missing information without a message");
      }

      return jsonResponse({
        text: message,
        folder,
        skill: skill?.id ?? route.skill,
        subSkill: route.subSkill ?? null,
        tool: tool.name,
        arguments: {},
        ui: null,
      });
    }

    // ------------------------------------------------
    // 20. Parse prepared arguments
    // ------------------------------------------------

    if (!prepared.argumentsJson) {
      throw new Error("Argument preparation returned no arguments");
    }

    let toolArguments: Record<string, unknown>;

    try {
      const parsed = JSON.parse(prepared.argumentsJson);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Tool arguments must be an object");
      }

      toolArguments = parsed as Record<string, unknown>;
    } catch (error) {
      console.error("Invalid prepared tool arguments:", error);

      return jsonResponse({ error: "The assistant prepared invalid tool arguments." }, 422);
    }

    // ------------------------------------------------
    // 21. Execute tool
    // ------------------------------------------------

    const toolResult = await executeTool({ request, auth, tool: tool.name, arguments: toolArguments });

    // ------------------------------------------------
    // 22. Generate final response
    // ------------------------------------------------

    return handleToolResult({
      mode: "tool-result",
      folder,
      tool: tool.name,
      skill: skill?.id ?? route.skill!,
      subSkill: route.subSkill ?? null,
      toolResult,
    });
  } catch (error) {
    console.error("AI generation failed:", error);

    const { requestId } = await captureError(error, {
      requestId: locals.myTicketsRequestId as string | undefined,
      request,
    });

    return new Response(
      JSON.stringify({ success: false, error: "AI generation failed" }),
      {
        status: 500,
        headers: {
          ...jsonHeaders,
          "x-mytickets-request-id": requestId,
        },
      },
    );
  }
};

// /api/sidebar-ai/generate

import type { APIRoute } from "astro";

import {
  generateText,
  streamText,
  Output,
} from "ai";

import { z } from "zod";

import { openAiClient } from "../aiUtils/aiClient";
import { captureError } from "../reportError";

import {
  getRegistry,
  type CachedSkill,
  type CachedTool,
} from "./lib/sidebar-ai/registry";

import { buildToolUI } from "./lib/sidebar-ai/tool-ui";

const AIModel = "gpt-5-mini";
const INTERMEDIATE_PROGRESS_WORD_INTERVAL = 60;

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  skill?: string | null;
  subSkill?: string | null;
}

interface GenerateContext {
  currentUserRequest: string;
  conversation: ConversationMessage[];
}

interface ToolResultRequest {
  mode: "tool-result";
  tool: string;
  skill: string;
  subSkill?: string | null;
  toolResult: unknown;
  conversation?: ConversationMessage[];
}

/**
 * Routing only selects the configured skill/sub-skill/tool. The final answer
 * is generated separately so routing stays fast and progress can arrive while
 * the answer is being produced.
 */
const RouteDecisionSchema = z.object({
  action: z.enum(["answer", "tool"]),
  progress: z.string(),
  skill: z.string().nullable(),
  skills: z.array(z.string()),
  subSkill: z.string().nullable(),
  subSkills: z.array(z.string()),
  tool: z.string().nullable(),
});

type RouteDecision = z.infer<typeof RouteDecisionSchema>;

const ArgumentPreparationSchema = z.object({
  status: z.enum(["ready", "missing_information"]),
  argumentsJson: z.string().nullable(),
  message: z.string().nullable(),
});

type ArgumentPreparation = z.infer<typeof ArgumentPreparationSchema>;

type GenerateResponsePayload = {
  text: string;
  skill: string | null;
  subSkill: string | null;
  skills: string[];
  tool: string | null;
  arguments?: Record<string, unknown>;
  ui: unknown;
  // Which of the internal skills/_system/*.md rule files were genuinely
  // used to produce this particular response, e.g. "router", "response".
  // Only ever the stages that actually ran for this return path.
  systemSkills: string[];
};

type ProgressEvent = {
  type: "progress";
  message: string;
};

type CompleteEvent = {
  type: "complete";
  data: GenerateResponsePayload;
};

type ErrorEvent = {
  type: "error";
  message: string;
};

type GenerationEvent = ProgressEvent | CompleteEvent | ErrorEvent;
type ProgressEmitter = (message: string) => void;

class RequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RequestError";
    this.status = status;
  }
}

const jsonHeaders = {
  "Content-Type": "application/json",
};

const jsonResponse = (body: unknown, status = 200, headers?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...jsonHeaders,
      ...headers,
    },
  });

const streamHeaders = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

function createSseResponse(
  run: (emit: ProgressEmitter) => Promise<GenerateResponsePayload | void>,
  onError?: (error: unknown) => Promise<void>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: GenerationEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      const emitted = new Set<string>();

      const emitProgress: ProgressEmitter = (message) => {
        const normalized = message.trim();

        if (!normalized || emitted.has(normalized)) {
          return;
        }

        emitted.add(normalized);
        console.info("Sidebar AI progress status sent:", normalized);
        send({
          type: "progress",
          message: normalized,
        });
      };

      // Keep the HTTP/SSE connection open immediately. This is protocol-only
      // and is never rendered as a user-facing message.
      controller.enqueue(encoder.encode(": stream-open\n\n"));

      void (async () => {
        try {
          const result = await run(emitProgress);

          if (result) {
            send({
              type: "complete",
              data: result,
            });
          }
        } catch (error) {
          console.error("AI generation stream failed:", error);

          if (onError) {
            try {
              await onError(error);
            } catch (captureError) {
              console.error(
                "Failed to capture AI generation error:",
                captureError,
              );
            }
          }

          send({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "AI generation failed",
          });
        } finally {
          try {
            controller.close();
          } catch {
            // The client may have disconnected already.
          }
        }
      })();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: streamHeaders,
  });
}

const isValidToolName = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]+$/.test(value);

const isValidSkillPath = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(value);

function requireObject(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function validateSkillRelationship(
  parentSkill: string | null,
  subSkill: string | null,
): string | false | void {
  if (!parentSkill || !subSkill || parentSkill === subSkill) {
    return;
  }

  if (!subSkill.startsWith(`${parentSkill}/`)) {
    return `${parentSkill}/${subSkill}`;
  }

  return false;
}

function resolveSkillId(
  skill: string | null,
  subSkill: string | null,
): string | null {
  return subSkill ?? skill;
}

function validateToolAccess(
  skill: CachedSkill | null,
  tool: CachedTool,
): void {
  if (!skill) {
    throw new Error(
      `Error: A skill must be selected before a tool can be executed: ${tool.name}`,
    );
  }

  if (!skill.tools.includes(tool.name)) {
    throw new Error(
      `Tool ${tool.name} is not declared by skill ${skill.id}`,
    );
  }
}

function getConversation(body: Record<string, unknown>): ConversationMessage[] {
  if (!Array.isArray(body.conversation)) {
    return [];
  }

  const messages: ConversationMessage[] = [];

  for (const message of body.conversation) {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      continue;
    }

    const record = message as Record<string, unknown>;

    if (record.role !== "user" && record.role !== "assistant") {
      continue;
    }

    if (typeof record.content !== "string") {
      continue;
    }

    const content = record.content.trim();

    if (!content) {
      continue;
    }

    messages.push({
      role: record.role,
      content,
      skill: typeof record.skill === "string" ? record.skill : null,
      subSkill:
        typeof record.subSkill === "string" ? record.subSkill : null,
    });
  }

  return messages.slice(-8);
}

function omitCurrentPrompt(
  conversation: ConversationMessage[],
  prompt: string,
): ConversationMessage[] {
  const history = [...conversation];

  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].role !== "user") {
      continue;
    }

    if (history[index].content === prompt) {
      history.splice(index, 1);
    }

    break;
  }

  return history;
}

function getActiveSkill(
  conversation: ConversationMessage[],
): { skill: string | null; subSkill: string | null } {
  for (let i = conversation.length - 1; i >= 0; i -= 1) {
    const message = conversation[i];

    if (message.skill?.trim()) {
      return {
        skill: message.skill,
        subSkill: message.subSkill ?? null,
      };
    }
  }

  return {
    skill: null,
    subSkill: null,
  };
}

function countProgressWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function isSpecificProgressMessage(value: string): boolean {
  const message = value.trim();

  if (message.length < 3 || message.length > 160 || !/[A-Za-z]/.test(message)) {
    return false;
  }

  const normalized = message
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .trim();

  const genericMessages = new Set([
    "here",
    "okay",
    "ok",
    "sure",
    "got it",
    "working on it",
    "working on your request",
    "reading your request",
    "processing your request",
    "thinking about this",
  ]);

  return !genericMessages.has(normalized);
}

function normalizeProgressMessage(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:progress|status|update|task)\s*:\s*/i, "")
    .replace(/^[`\"']+|[`\"']+$/g, "")
    .replace(/\s*\.{2,}\s*$/, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  return isSpecificProgressMessage(cleaned) ? cleaned : null;
}

/**
 * Generates a single progress message grounded in state that is already
 * known to be true at the moment it's called (a confirmed route, a
 * confirmed tool, an actual tool result, etc). Callers should only invoke
 * this once the described stage is genuinely happening, never speculatively
 * ahead of time, so the message can never describe work that didn't occur.
 */
async function generateGroundedStage(options: {
  model: Awaited<ReturnType<typeof openAiClient>>;
  registry: Awaited<ReturnType<typeof getRegistry>>;
  stage: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const result = await generateText({
      model: options.model,
      maxOutputTokens: 40,
      providerOptions: {
        openai: { reasoningEffort: "minimal" },
      },
      system: options.registry.system.progress,
      prompt: JSON.stringify({
        mode: "single",
        statusRequirements: {
          generateFromCurrentUserRequest: true,
          describeConfirmedWorkInTheContextOfThatRequest: true,
          useNaturalSpecificWording: true,
          doNotUseCannedStatusText: true,
          doNotInventWorkOrResults: true,
        },
        ...options.stage,
      }),
    });

    const firstLine = result.text.split(/\r?\n/)[0] ?? "";
    return normalizeProgressMessage(firstLine);
  } catch (error) {
    console.error("Grounded progress generation failed:", error);
    return null;
  }
}

async function generateRouteDecision(options: {
  model: Awaited<ReturnType<typeof openAiClient>>;
  registry: Awaited<ReturnType<typeof getRegistry>>;
  prompt: string;
  conversation: ConversationMessage[];
  activeSkill: { skill: string | null; subSkill: string | null };
}): Promise<RouteDecision> {
  const result = await generateText({
    model: options.model,
    output: Output.object({
      schema: RouteDecisionSchema,
    }),
    system: options.registry.system.router,
    prompt: JSON.stringify({
      currentUserRequest: options.prompt,
      conversation: options.conversation,
      activeSkill: options.activeSkill,
      registry: {
        skills: options.registry.skillSummaries.map((skill) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description.slice(0, 180),
          tools: skill.tools,
          subSkills: skill.subSkills.map((subSkill) => ({
            id: subSkill.id,
            name: subSkill.name,
            description: subSkill.description.slice(0, 120),
          })),
        })),
        tools: options.registry.toolSummaries.map((tool) => ({
          name: tool.name,
          description: tool.description.slice(0, 160),
          skills: tool.skills,
        })),
      },
      requirements: {
        chooseActionAndSkillsAndProgressOnly: true,
        generateAConciseRequestSpecificProgressStatus: true,
        progressMustBeSpecificToCurrentUserRequest: true,
        selectEverySkillNeededToFollowTheRequest: true,
        skillsMustUseAvailableSkillIds: true,
        skillsMustBeAnEmptyArrayWhenNoAdditionalSkillsApply: true,
        selectEveryRelevantSubSkill: true,
        subSkillsMustBeAnEmptyArrayWhenNoneApply: true,
        doNotGenerateTheFinalAnswer: true,
      },
    }),
  });

  return result.output as RouteDecision;
}

async function generateFinalResponse(options: {
  model: Awaited<ReturnType<typeof openAiClient>>;
  registry: Awaited<ReturnType<typeof getRegistry>>;
  skill: CachedSkill | null;
  skills?: CachedSkill[];
  parentSkill: CachedSkill | null;
  subSkill: CachedSkill | null;
  context: GenerateContext;
  tool?: CachedTool | null;
  toolResult?: unknown;
  emitFirstTokenProgress?: () => Promise<void> | void;
  emitDuringResponseProgress?: (draft: string) => Promise<void> | void;
}): Promise<string> {
  const systemParts = [options.registry.system.response];
  const selectedSkills = options.skills?.length
    ? options.skills
    : [options.skill].filter((value): value is CachedSkill => value !== null);
  const includedSkillIds = new Set<string>();

  if (options.parentSkill?.content) {
    systemParts.push(options.parentSkill.content);
    includedSkillIds.add(options.parentSkill.id);
  }

  if (
    options.skill?.content &&
    options.skill.id !== options.parentSkill?.id
  ) {
    systemParts.push(options.skill.content);
    includedSkillIds.add(options.skill.id);
  }

  if (
    options.subSkill?.content &&
    options.subSkill.id !== options.skill?.id
  ) {
    systemParts.push(options.subSkill.content);
    includedSkillIds.add(options.subSkill.id);
  }

  for (const selected of selectedSkills) {
    if (selected.content && !includedSkillIds.has(selected.id)) {
      systemParts.push(selected.content);
      includedSkillIds.add(selected.id);
    }
  }

  const result = streamText({
    model: options.model,
    system: systemParts.join("\n\n---\n\n"),
    prompt: JSON.stringify({
      currentUserRequest: options.context.currentUserRequest,
      conversation: options.context.conversation,
      selectedSkills: selectedSkills.map(({ id }) => id),
      selectedTool: options.tool
        ? {
            name: options.tool.name,
            description: options.tool.description ?? "",
            content: options.tool.content,
          }
        : null,
      actualToolResult:
        options.toolResult === undefined ? null : options.toolResult,
    }),
  });

  let responseText = "";
  let sawFirstToken = false;
  let lastProgressWordCount = 0;
  let latestDraftForProgress: string | null = null;
  let progressWorker: Promise<void> | null = null;

  const scheduleResponseProgress = (draft: string) => {
    latestDraftForProgress = draft;

    if (progressWorker) {
      return;
    }

    const worker = (async () => {
      while (latestDraftForProgress !== null) {
        const currentDraft = latestDraftForProgress;
        latestDraftForProgress = null;

        try {
          await options.emitDuringResponseProgress?.(currentDraft);
        } catch (error) {
          console.error("Failed to emit in-progress response status:", error);
        }
      }
    })();

    progressWorker = worker.finally(() => {
      progressWorker = null;
    });
  };

  for await (const delta of result.textStream) {
    responseText += delta;

    const currentWordCount = countProgressWords(responseText);

    if (
      currentWordCount - lastProgressWordCount >=
      INTERMEDIATE_PROGRESS_WORD_INTERVAL
    ) {
      lastProgressWordCount = currentWordCount;
      scheduleResponseProgress(responseText.slice(-1200));
    }

    if (!sawFirstToken && delta.trim()) {
      sawFirstToken = true;

      // Awaited here so this progress message is guaranteed to be emitted
      // before generateFinalResponse can return and the "complete" event
      // is sent — otherwise it could arrive after the client already has
      // the final answer.
      await options.emitFirstTokenProgress?.();
    }
  }

  await progressWorker;

  const trimmed = responseText.trim();

  if (!trimmed) {
    throw new Error("AI returned an empty response");
  }

  console.info("Sidebar AI response skills used:", [
    ...includedSkillIds,
  ]);

  return trimmed;
}

async function prepareToolArguments(options: {
  prompt: string;
  conversation: ConversationMessage[];
  skill: CachedSkill;
  tool: CachedTool;
  argumentPreparationSystem: string;
}): Promise<ArgumentPreparation> {
  const result = await generateText({
    model: await openAiClient(AIModel),
    output: Output.object({
      schema: ArgumentPreparationSchema,
    }),
    system: options.argumentPreparationSystem,
    prompt: JSON.stringify({
      currentUserRequest: options.prompt,
      conversation: options.conversation,
      selectedSkill: {
        id: options.skill.id,
        content: options.skill.content,
      },
      selectedTool: {
        name: options.tool.name,
        description: options.tool.description ?? "",
        input: options.tool.input ?? null,
        content: options.tool.content,
      },
    }),
  });

  return result.output as ArgumentPreparation;
}

async function executeTool(options: {
  request: Request;
  auth: string;
  tool: string;
  arguments: Record<string, unknown>;
}): Promise<unknown> {
  const url = new URL(
    "/api/sidebar-ai/tools/execute",
    options.request.url,
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: options.auth,
    },
    body: JSON.stringify({
      tool: options.tool,
      arguments: options.arguments,
    }),
  });

  const contentType = response.headers.get("content-type") ?? "";
  let result: unknown;

  if (contentType.includes("application/json")) {
    result = await response.json();
  } else {
    result = await response.text();
  }

  if (!response.ok) {
    const detail =
      typeof result === "string" ? result : JSON.stringify(result);

    throw new Error(
      `Tool execution failed (${response.status})${detail ? `: ${detail.slice(0, 500)}` : ""}`,
    );
  }

  return {
    transportSuccess: true,
    status: response.status,
    result,
  };
}

async function handleToolResult(
  body: Record<string, unknown>,
  registry: Awaited<ReturnType<typeof getRegistry>>,
  emitProgress: ProgressEmitter,
): Promise<GenerateResponsePayload> {
  const data = body as Partial<ToolResultRequest>;

  if (!isValidToolName(data.tool)) {
    throw new RequestError("A valid tool is required", 400);
  }

  if (!isValidSkillPath(data.skill)) {
    throw new RequestError("A valid skill is required", 400);
  }

  if (!("toolResult" in data)) {
    throw new RequestError("toolResult is required", 400);
  }

  const conversation = getConversation(body);
  const skill = registry.skills[data.skill] ?? null;
  const tool = registry.tools[data.tool] ?? null;

  if (!skill) {
    throw new RequestError(`Skill not found: ${data.skill}`, 404);
  }

  if (!tool) {
    throw new RequestError(`Tool not found: ${data.tool}`, 404);
  }

  validateToolAccess(skill, tool);

  if (data.subSkill && !isValidSkillPath(data.subSkill)) {
    throw new RequestError("Invalid sub-skill", 400);
  }

  if (data.subSkill) {
    const skillRelationship = validateSkillRelationship(data.skill, data.subSkill);
    if (skillRelationship) {
      
    }
  }

  const currentUserRequest =
    [...conversation]
      .reverse()
      .find((message) => message.role === "user")?.content ?? "";
  const context: GenerateContext = {
    currentUserRequest,
    conversation: omitCurrentPrompt(conversation, currentUserRequest),
  };

  const parentSkill = registry.skills[data.skill] ?? null;
  const subSkill = data.subSkill
    ? registry.skills[data.subSkill] ?? null
    : null;

  const model = await openAiClient(AIModel);

  const responseText = await generateFinalResponse({
    model,
    registry,
    skill,
    parentSkill,
    subSkill,
    context,
    tool,
    toolResult: data.toolResult,
    emitFirstTokenProgress: async () => {
      const message = await generateGroundedStage({
        model,
        registry,
        stage: {
          confirmedStage: "drafting the response from the completed tool result",
          confirmedSkill: skill.id,
          confirmedTool: tool.name,
          actualToolResult: data.toolResult,
        },
      });

      if (message) emitProgress(message);
    },
    emitDuringResponseProgress: async (draft) => {
      const message = await generateGroundedStage({
        model,
        registry,
        stage: {
          confirmedStage: "drafting the response from the completed tool result",
          currentUserRequest: context.currentUserRequest,
          selectedSkills: [skill.id, ...(data.subSkill ? [data.subSkill] : [])],
          confirmedTool: tool.name,
          responseDraftExcerpt: draft.slice(-500),
        },
      });

      if (message) emitProgress(message);
    },
  });

  return {
    text: responseText,
    skill: data.skill,
    subSkill: data.subSkill ?? null,
    skills: [...new Set([data.skill, ...(data.subSkill ? [data.subSkill] : [])])],
    tool: data.tool,
    ui: null,
    systemSkills: ["progress", "response"],
  };
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = request.headers.get("authorization");

    if (!auth) {
      return jsonResponse(
        { error: "authorization is required" },
        401,
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { error: "Invalid JSON body" },
        400,
      );
    }

    const requestBody = requireObject(
      body,
      "Invalid JSON body",
    );

    const registry = await getRegistry();

    if (requestBody.mode === "tool-result") {
      return createSseResponse(
        async (emitProgress) =>
          handleToolResult(
            requestBody,
            registry,
            emitProgress,
          ),
        async (error) => {
          if (!(error instanceof RequestError)) {
            await captureError(error, {
              requestId: locals.myTicketsRequestId as string | undefined,
              request,
            });
          }
        },
      );
    }

    if (typeof requestBody.prompt !== "string") {
      return jsonResponse(
        { error: "prompt is required" },
        400,
      );
    }

    const prompt = requestBody.prompt.trim();

    if (!prompt) {
      return jsonResponse(
        { error: "prompt cannot be empty" },
        400,
      );
    }

    const conversation = getConversation(requestBody);
    const activeSkill = getActiveSkill(conversation);
    const generationConversation = omitCurrentPrompt(conversation, prompt);

    return createSseResponse(
      async (emitProgress) => {
        const model = await openAiClient(AIModel);

        const routePromise = generateRouteDecision({
          model,
          registry,
          prompt,
          conversation: generationConversation,
          activeSkill,
        });

        const route = await routePromise;
        const initialProgress = normalizeProgressMessage(route.progress);

        if (initialProgress) emitProgress(initialProgress);

        route.skills = [...new Set([
          ...(route.skill ? [route.skill] : []),
          ...route.skills,
          ...(route.subSkill ? [route.subSkill] : []),
          ...route.subSkills,
        ])];

        if (route.skill !== null && !isValidSkillPath(route.skill)) {
          throw new Error(
            `AI selected invalid skill: ${String(route.skill)}`,
          );
        }

        if (route.subSkill !== null && !isValidSkillPath(route.subSkill)) {
          throw new Error(
            `AI selected invalid sub-skill: ${String(route.subSkill)}`,
          );
        }

        const requestedSubSkills = [...new Set([
          ...(route.subSkill ? [route.subSkill] : []),
          ...route.subSkills,
        ])];

        for (const selectedSubSkill of requestedSubSkills) {
          if (!isValidSkillPath(selectedSubSkill)) {
            throw new Error(
              `AI selected invalid sub-skill: ${String(selectedSubSkill)}`,
            );
          }
        }

        for (const selectedId of route.skills) {
          if (!isValidSkillPath(selectedId) || !registry.skills[selectedId]) {
            throw new Error(`Selected skill is not available: ${selectedId}`);
          }
        }

        for (const selectedSubSkill of requestedSubSkills) {
          if (!registry.skills[selectedSubSkill]) {
            throw new Error(
              `Selected sub-skill is not available: ${selectedSubSkill}`,
            );
          }

          const parentId = selectedSubSkill.slice(
            0,
            selectedSubSkill.lastIndexOf("/"),
          );

          if (!parentId || !registry.skills[parentId]) {
            throw new Error(
              `Parent skill for sub-skill ${selectedSubSkill} is not available`,
            );
          }

          if (!route.skills.includes(parentId)) route.skills.push(parentId);
        }

        route.subSkill = requestedSubSkills[0] ?? null;

        const skillId = resolveSkillId(route.skill, route.subSkill);
        const skill = skillId ? registry.skills[skillId] ?? null : null;
        const additionalSkills = route.skills
          .map((id) => registry.skills[id])
          .filter((item): item is CachedSkill => Boolean(item));
        const parentSkill = route.skill
          ? registry.skills[route.skill] ?? null
          : null;
        const subSkill = route.subSkill
          ? registry.skills[route.subSkill] ?? null
          : null;

        if (route.skill && !parentSkill) {
          throw new Error(
            `Selected skill is not available: ${route.skill}`,
          );
        }

        if (route.subSkill && !subSkill) {
          throw new Error(
            `Selected sub-skill is not available: ${route.subSkill}`,
          );
        }

        const context: GenerateContext = {
          currentUserRequest: prompt,
          conversation: generationConversation,
        };

        // Now genuinely known — grounded in the real routing decision.
        // Kicked off without blocking further work; emitted as soon as
        // it's ready, and always before the response it describes.
        const routeConfirmedPromise = generateGroundedStage({
          model,
          registry,
          stage: {
            confirmedStage:
              route.action === "answer"
                ? "preparing to answer the request"
                : "preparing to use a tool",
            confirmedSkill: skill?.id ?? null,
            confirmedAction: route.action,
          },
        });

        if (route.action === "answer") {
          const responseText = await generateFinalResponse({
            model,
            registry,
            skill,
            skills: additionalSkills,
            parentSkill,
            subSkill,
            context,
            emitFirstTokenProgress: async () => {
              const message = await routeConfirmedPromise;

              if (message) {
                emitProgress(message);
              }
            },
            emitDuringResponseProgress: async (draft) => {
              const message = await generateGroundedStage({
                model,
                registry,
                stage: {
                  confirmedStage: "drafting the response",
                  currentUserRequest: prompt,
                  selectedSkills: route.skills,
                  responseDraftExcerpt: draft.slice(-500),
                },
              });

              if (message) emitProgress(message);
            },
          });

          return {
            text: responseText,
            skill: route.skill,
            subSkill: route.subSkill,
            skills: [...new Set(route.skills)],
            tool: null,
            arguments: {},
            ui: null,
            systemSkills: ["router", "progress", "response"],
          };
        }

        if (route.action !== "tool") {
          throw new Error(
            `Unsupported routing action: ${String(route.action)}`,
          );
        }

        if (!isValidToolName(route.tool)) {
          throw new Error(
            `AI selected invalid tool: ${String(route.tool)}`,
          );
        }

        if (!skill) {
          throw new Error("A tool route must select a skill");
        }

        const tool = registry.tools[route.tool] ?? null;

        if (!tool) {
          throw new Error(
            `Selected tool is not available: ${route.tool}`,
          );
        }

        validateToolAccess(skill, tool);

        const routeConfirmedMessage = await routeConfirmedPromise;

        if (routeConfirmedMessage) {
          emitProgress(routeConfirmedMessage);
        }

        const ui = await buildToolUI(tool, request);

        if (ui) {
          return {
            text: ui.title,
            skill: skill.id,
            subSkill: route.subSkill ?? null,
            skills: [...new Set(route.skills)],
            tool: tool.name,
            arguments: {},
            ui,
            systemSkills: ["router", "progress"],
          };
        }

        // Tool confirmed, about to prepare its arguments — grounded.
        const preparingArgsPromise = generateGroundedStage({
          model,
          registry,
          stage: {
            confirmedStage: "preparing the tool's arguments",
            confirmedSkill: skill.id,
            confirmedTool: tool.name,
            toolDescription: tool.description ?? "",
          },
        });

        const prepared = await prepareToolArguments({
          prompt,
          conversation,
          skill,
          tool,
          argumentPreparationSystem:
            registry.system.argumentPreparation,
        });

        const preparingArgsMessage = await preparingArgsPromise;

        if (preparingArgsMessage) {
          emitProgress(preparingArgsMessage);
        }

        if (prepared.status === "missing_information") {
          const message = prepared.message?.trim();

          if (!message) {
            throw new Error(
              "Argument preparation returned no clarification message",
            );
          }

          return {
            text: message,
            skill: skill.id,
            subSkill: route.subSkill ?? null,
            skills: [...new Set(route.skills)],
            tool: tool.name,
            arguments: {},
            ui: null,
            systemSkills: ["router", "progress", "argumentPreparation"],
          };
        }

        if (prepared.status !== "ready") {
          throw new Error(
            `Unsupported argument-preparation status: ${String(
              prepared.status,
            )}`,
          );
        }

        if (!prepared.argumentsJson) {
          throw new Error(
            "Argument preparation returned no arguments",
          );
        }

        let toolArguments: Record<string, unknown>;

        try {
          const parsed = JSON.parse(prepared.argumentsJson);
          toolArguments = requireObject(
            parsed,
            "Tool arguments must be an object",
          );
        } catch (error) {
          console.error(
            "Invalid prepared tool arguments:",
            error,
          );

          throw new Error(
            "The assistant prepared invalid tool arguments.",
          );
        }

        // About to actually call the tool — grounded, generated
        // concurrently with the real call so it's true the moment it
        // lands, without delaying the call itself.
        const [executingToolMessage, toolResult] = await Promise.all([
          generateGroundedStage({
            model,
            registry,
            stage: {
              confirmedStage: "executing the selected tool",
              confirmedSkill: skill.id,
              confirmedTool: tool.name,
              toolDescription: tool.description ?? "",
            },
          }),
          executeTool({
            request,
            auth,
            tool: tool.name,
            arguments: toolArguments,
          }),
        ]);

        if (executingToolMessage) {
          emitProgress(executingToolMessage);
        }

        // The tool has actually returned a result now — grounded in the
        // real, already-received result rather than a guess.
        const resultReceivedMessage = await generateGroundedStage({
          model,
          registry,
          stage: {
            confirmedStage: "reviewing the tool's result",
            confirmedSkill: skill.id,
            confirmedTool: tool.name,
            actualToolResult: toolResult,
          },
        });

        if (resultReceivedMessage) {
          emitProgress(resultReceivedMessage);
        }

        return {
          text: await generateFinalResponse({
            model,
            registry,
            skill,
            parentSkill,
            subSkill,
            context,
            tool,
            toolResult,
            emitFirstTokenProgress: undefined,
            emitDuringResponseProgress: async (draft) => {
              const message = await generateGroundedStage({
                model,
                registry,
                stage: {
                  confirmedStage: "drafting the response from the completed tool result",
                  currentUserRequest: prompt,
                  selectedSkills: route.skills,
                  confirmedTool: tool.name,
                  responseDraftExcerpt: draft.slice(-500),
                },
              });

              if (message) emitProgress(message);
            },
          }),
          skill: skill.id,
          subSkill: route.subSkill ?? null,
          skills: [...new Set(route.skills)],
          tool: tool.name,
          arguments: toolArguments,
          ui: null,
          systemSkills: [
            "router",
            "progress",
            "argumentPreparation",
            "response",
          ],
        };
      },
      async (error) => {
        if (!(error instanceof RequestError)) {
          await captureError(error, {
            requestId: locals.myTicketsRequestId as string | undefined,
            request,
          });
        }
      },
    );
  } catch (error) {
    console.error("AI generation failed:", error);

    if (error instanceof RequestError) {
      return jsonResponse(
        { error: error.message },
        error.status,
      );
    }

    const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI generation failed",
      },
      500,
      {
        "x-mytickets-request-id": requestId,
      },
    );
  }
};

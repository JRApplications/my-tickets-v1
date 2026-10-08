import * as yaml from "js-yaml";
import { GITHUB_SKILLS_TOKEN } from 'astro:env/server';
const GITHUB_OWNER = "JRApplications";
const GITHUB_REPO = "my-tickets-skills";
const GITHUB_BRANCH = "main";

const CACHE_TTL_MS = 5 * 60 * 1000;

const SYSTEM_FILE_PATHS = {
  router: "skills/_system/ROUTER.md",
  execution: "skills/_system/EXECUTION.md",
  response: "skills/_system/RESPONSE.md",
  argumentPreparation: "skills/_system/ARGUMENTS.md",
  progress: "skills/_system/PROGRESS.md",
} as const;

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE";

export interface ToolUIOption {
  label: string;
  value: string;
}

export interface ToolDataSource {
  path: string;
  method?: "GET" | "POST";
  labelField: string;
  valueField: string;
}

export interface ToolUIField {
  name: string;
  label: string;
  type: "text" | "select";
  required?: boolean;
  placeholder?: string;
  options?: ToolUIOption[];
  dataSource?: ToolDataSource;
}

export interface ToolUI {
  type: "form";
  title: string;
  submitLabel: string;
  fields: ToolUIField[];
}

export interface ToolEndpoint {
  path: string;
  method: HttpMethod;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  type?: string;
  input?: unknown;
  endpoint?: ToolEndpoint;
  ui?: ToolUI;
}

export interface CachedTool extends ToolDefinition {
  path: string;
  content: string;
}

export interface SkillChildSummary {
  id: string;
  name: string;
  description: string;
}

export interface CachedSkill {
  id: string;
  name: string;
  description: string;
  tools: string[];
  subSkills: SkillChildSummary[];
  content: string;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  tools: string[];
  subSkills: SkillChildSummary[];
}

export interface ToolSummary {
  name: string;
  description: string;
  skills: string[];
  input?: unknown;
}

export interface SystemRules {
  router: string;
  execution: string;
  response: string;
  argumentPreparation: string;
  progress: string;
}

export interface SidebarAIRegistry {
  skills: Record<string, CachedSkill>;
  tools: Record<string, CachedTool>;
  system: SystemRules;
  skillSummaries: SkillSummary[];
  toolSummaries: ToolSummary[];
  routingMetadata: string;
  treeSha: string;
  loadedAt: number;
}

interface GithubTreeEntry {
  path: string;
  mode?: string;
  type: "blob" | "tree" | "commit";
  sha?: string;
  size?: number;
}

interface GithubFileResponse {
  type?: string;
  encoding?: string;
  content?: string;
}

let registryCache: SidebarAIRegistry | null = null;
let registryPromise: Promise<SidebarAIRegistry> | null = null;

// ======================================================
// GitHub
// ======================================================

function getGithubToken(): string {
  const token = GITHUB_SKILLS_TOKEN;

  if (!token) {
    throw new Error(
      "GITHUB_SKILLS_TOKEN is not configured",
    );
  }

  return token;
}

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function encodeGithubPath(path: string): string {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function githubJson<T>(url: string): Promise<T> {
  const token = getGithubToken();

  const response = await fetch(url, {
    headers: githubHeaders(token),
  });

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `GitHub request failed: ${response.status} ${response.statusText}: ${text}`,
    );
  }

  return (await response.json()) as T;
}

/**
 * Get the entire repository tree in one GitHub request.
 * This avoids recursive directory listing requests.
 */
interface GithubTree {
  sha: string;
  entries: GithubTreeEntry[];
}

async function githubTree(): Promise<GithubTree> {
  const url =
    `https://api.github.com/repos/` +
    `${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/git/trees/${encodeURIComponent(GITHUB_BRANCH)}` +
    `?recursive=1`;

  const data = await githubJson<{
    sha?: string;
    tree?: GithubTreeEntry[];
    truncated?: boolean;
  }>(url);

  if (
    typeof data.sha !== "string" ||
    !Array.isArray(data.tree)
  ) {
    throw new Error("GitHub repository tree is invalid");
  }

  if (data.truncated) {
    throw new Error(
      "GitHub repository tree was truncated; refusing to build an incomplete registry",
    );
  }

  return {
    sha: data.sha,
    entries: data.tree,
  };
}

async function githubFile(path: string): Promise<string> {
  const encodedPath = encodeGithubPath(path);

  const url =
    `https://api.github.com/repos/` +
    `${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${encodedPath}` +
    `?ref=${encodeURIComponent(GITHUB_BRANCH)}`;

  const data = await githubJson<GithubFileResponse>(url);

  if (
    data.type !== "file" ||
    typeof data.content !== "string"
  ) {
    throw new Error(`GitHub file not found: ${path}`);
  }

  return Buffer.from(
    data.content.replace(/\n/g, ""),
    "base64",
  ).toString("utf-8");
}

// ======================================================
// Frontmatter
// ======================================================

function parseFrontmatter(
  content: string,
): Record<string, unknown> {
  const match = content.match(
    /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
  );

  if (!match) {
    return {};
  }

  const parsed = yaml.load(match[1]);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return {};
  }

  return parsed as Record<string, unknown>;
}

// ======================================================
// Validation
// ======================================================

const VALID_SKILL_PATH =
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

const VALID_TOOL_NAME = /^[a-zA-Z0-9_-]+$/;
const VALID_ENDPOINT_PATH = /^\/api\/[a-zA-Z0-9/_-]+$/;
const VALID_FIELD_NAME = /^[a-zA-Z0-9_-]+$/;

function readString(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" &&
      item.trim().length > 0,
  );
}

function validateDataSource(
  dataSource: unknown,
  fieldName: string,
): string | null {
  if (
    !dataSource ||
    typeof dataSource !== "object" ||
    Array.isArray(dataSource)
  ) {
    return `Invalid data source for ${fieldName}`;
  }

  const source = dataSource as Partial<ToolDataSource>;

  if (
    typeof source.path !== "string" ||
    !VALID_ENDPOINT_PATH.test(source.path)
  ) {
    return `Invalid data source path for ${fieldName}`;
  }

  if (
    source.method !== undefined &&
    source.method !== "GET" &&
    source.method !== "POST"
  ) {
    return `Invalid data source method for ${fieldName}`;
  }

  if (
    typeof source.labelField !== "string" ||
    !source.labelField.trim() ||
    typeof source.valueField !== "string" ||
    !source.valueField.trim()
  ) {
    return `Invalid data source mapping for ${fieldName}`;
  }

  return null;
}

function validateToolDefinition(
  definition: ToolDefinition,
): string | null {
  if (
    typeof definition.name !== "string" ||
    !VALID_TOOL_NAME.test(definition.name)
  ) {
    return "Invalid tool name";
  }

  if (definition.endpoint !== undefined) {
    if (
      !definition.endpoint ||
      typeof definition.endpoint !== "object" ||
      Array.isArray(definition.endpoint)
    ) {
      return "Invalid tool endpoint";
    }

    if (
      typeof definition.endpoint.path !== "string" ||
      !VALID_ENDPOINT_PATH.test(definition.endpoint.path)
    ) {
      return "Tool endpoint must be an internal /api/ path";
    }

    const allowedMethods: HttpMethod[] = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ];

    if (!allowedMethods.includes(definition.endpoint.method)) {
      return "Invalid tool endpoint method";
    }
  }

  if (definition.ui !== undefined) {
    if (
      !definition.ui ||
      typeof definition.ui !== "object" ||
      Array.isArray(definition.ui)
    ) {
      return "Invalid tool UI definition";
    }

    if (definition.ui.type !== "form") {
      return `Unsupported tool UI type: ${String(
        definition.ui.type,
      )}`;
    }

    if (
      typeof definition.ui.title !== "string" ||
      !definition.ui.title.trim() ||
      typeof definition.ui.submitLabel !== "string" ||
      !definition.ui.submitLabel.trim()
    ) {
      return "Tool UI title and submitLabel are required";
    }

    if (!Array.isArray(definition.ui.fields)) {
      return "Tool UI fields must be an array";
    }

    const fieldNames = new Set<string>();

    for (const field of definition.ui.fields) {
      if (
        !field ||
        typeof field !== "object" ||
        Array.isArray(field)
      ) {
        return "Invalid tool UI field";
      }

      if (
        typeof field.name !== "string" ||
        !VALID_FIELD_NAME.test(field.name) ||
        typeof field.label !== "string" ||
        !field.label.trim()
      ) {
        return "Tool UI field name and label are required";
      }

      if (fieldNames.has(field.name)) {
        return `Duplicate UI field name: ${field.name}`;
      }

      fieldNames.add(field.name);

      if (
        field.type !== "text" &&
        field.type !== "select"
      ) {
        return `Unsupported UI field type: ${String(
          field.type,
        )}`;
      }

      if (
        field.type === "select" &&
        field.options !== undefined
      ) {
        if (!Array.isArray(field.options)) {
          return `Invalid options for ${field.name}`;
        }

        for (const option of field.options) {
          if (
            !option ||
            typeof option !== "object" ||
            Array.isArray(option) ||
            typeof option.label !== "string" ||
            typeof option.value !== "string"
          ) {
            return `Invalid option for ${field.name}`;
          }
        }
      }

      if (
        field.type === "select" &&
        field.dataSource !== undefined
      ) {
        const error = validateDataSource(
          field.dataSource,
          field.name,
        );

        if (error) {
          return error;
        }
      }
    }
  }

  return null;
}

// ======================================================
// System rules
// ======================================================

async function loadSystemRules(
  tree: GithubTreeEntry[],
): Promise<SystemRules> {
  const treePaths = new Set(
    tree
      .filter((entry) => entry.type === "blob")
      .map((entry) => entry.path),
  );

  for (const path of Object.values(SYSTEM_FILE_PATHS)) {
    if (!treePaths.has(path)) {
      throw new Error(`Required system file is missing: ${path}`);
    }
  }

  const [
    router,
    execution,
    response,
    argumentPreparation,
    progress,
  ] = await Promise.all([
    githubFile(SYSTEM_FILE_PATHS.router),
    githubFile(SYSTEM_FILE_PATHS.execution),
    githubFile(SYSTEM_FILE_PATHS.response),
    githubFile(SYSTEM_FILE_PATHS.argumentPreparation),
    githubFile(SYSTEM_FILE_PATHS.progress),
  ]);

  for (const [name, content] of Object.entries({
    router,
    execution,
    response,
    argumentPreparation,
    progress,
  })) {
    if (!content.trim()) {
      throw new Error(`System file is empty: ${name}`);
    }
  }

  return {
    router,
    execution,
    response,
    argumentPreparation,
    progress,
  };
}

// ======================================================
// Skills
// ======================================================

function getSkillPaths(
  tree: GithubTreeEntry[],
): string[] {
  const paths = new Set<string>();

  for (const entry of tree) {
    if (
      entry.type !== "blob" ||
      !entry.path.startsWith("skills/") ||
      entry.path.startsWith("skills/_system/") ||
      entry.path.startsWith("skills/tools/")
    ) {
      continue;
    }

    if (!entry.path.endsWith("/SKILL.md")) {
      continue;
    }

    const skillPath = entry.path
      .slice("skills/".length)
      .slice(0, -"SKILL.md".length - 1);

    if (
      !skillPath ||
      !VALID_SKILL_PATH.test(skillPath)
    ) {
      continue;
    }

    paths.add(skillPath);
  }

  return [...paths];
}

async function loadSkill(
  skillPath: string,
): Promise<CachedSkill | null> {
  try {
    const content = await githubFile(
      `skills/${skillPath}/SKILL.md`,
    );
    const frontmatter = parseFrontmatter(content);

    return {
      id: skillPath,
      name: readString(
        frontmatter.name,
        skillPath.split("/").pop() ?? skillPath,
      ),
      description: readString(frontmatter.description),
      tools: readStringArray(frontmatter.tools),
      subSkills: [],
      content,
    };
  } catch (error) {
    console.warn(
      `Failed to load skill ${skillPath}:`,
      error,
    );

    return null;
  }
}

async function loadSkills(
  tree: GithubTreeEntry[],
): Promise<Record<string, CachedSkill>> {
  const loaded = await Promise.all(
    getSkillPaths(tree).map((path) => loadSkill(path)),
  );

  const skills: Record<string, CachedSkill> = {};

  for (const skill of loaded) {
    if (skill) {
      skills[skill.id] = skill;
    }
  }

  for (const skill of Object.values(skills)) {
    const lastSlash = skill.id.lastIndexOf("/");

    if (lastSlash === -1) {
      continue;
    }

    const parentId = skill.id.slice(0, lastSlash);
    const parent = skills[parentId];

    if (!parent) {
      continue;
    }

    parent.subSkills.push({
      id: skill.id,
      name: skill.name,
      description: skill.description,
    });
  }

  return skills;
}

// ======================================================
// Tools
// ======================================================

function getToolPaths(
  tree: GithubTreeEntry[],
): Array<{
  directory: string;
  filePath: string;
}> {
  const result: Array<{
    directory: string;
    filePath: string;
  }> = [];

  for (const entry of tree) {
    if (
      entry.type !== "blob" ||
      !entry.path.startsWith("skills/tools/") ||
      !entry.path.endsWith("/TOOL.md")
    ) {
      continue;
    }

    const relative = entry.path.slice("skills/tools/".length);
    const parts = relative.split("/");

    if (parts.length !== 2) {
      continue;
    }

    const directory = parts[0];

    if (
      !directory ||
      !VALID_TOOL_NAME.test(directory)
    ) {
      continue;
    }

    result.push({
      directory,
      filePath: entry.path,
    });
  }

  return result;
}

async function loadTool(
  directory: string,
  filePath: string,
): Promise<CachedTool | null> {
  try {
    const content = await githubFile(filePath);
    const frontmatter = parseFrontmatter(content);

    const definition: ToolDefinition = {
      name: directory,
      description: readString(frontmatter.description),
      type:
        typeof frontmatter.type === "string"
          ? frontmatter.type
          : undefined,
      input: frontmatter.input,
      endpoint:
        frontmatter.endpoint as ToolEndpoint | undefined,
      ui:
        frontmatter.ui as ToolUI | undefined,
    };

    const validationError =
      validateToolDefinition(definition);

    if (validationError) {
      console.warn(
        `Ignoring invalid tool ${directory}: ${validationError}`,
      );
      return null;
    }

    return {
      ...definition,
      path: filePath,
      content,
    };
  } catch (error) {
    console.warn(
      `Failed to load tool ${directory}:`,
      error,
    );
    return null;
  }
}

async function loadTools(
  tree: GithubTreeEntry[],
): Promise<Record<string, CachedTool>> {
  const loaded = await Promise.all(
    getToolPaths(tree).map(
      ({ directory, filePath }) =>
        loadTool(directory, filePath),
    ),
  );

  const tools: Record<string, CachedTool> = {};

  for (const tool of loaded) {
    if (tool) {
      tools[tool.name] = tool;
    }
  }

  return tools;
}

// ======================================================
// Summaries
// ======================================================

export function buildSkillSummaries(
  registry: SidebarAIRegistry,
): SkillSummary[] {
  return registry.skillSummaries.length > 0
    ? registry.skillSummaries
    : Object.values(registry.skills).map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        tools: skill.tools,
        subSkills: skill.subSkills,
      }));
}

export function buildToolSummaries(
  registry: SidebarAIRegistry,
): ToolSummary[] {
  return registry.toolSummaries.length > 0
    ? registry.toolSummaries
    : Object.values(registry.tools).map((tool) => ({
        name: tool.name,
        description: tool.description ?? "",
        skills: Object.values(registry.skills)
          .filter((skill) =>
            skill.tools.includes(tool.name),
          )
          .map((skill) => skill.id),
        input: tool.input,
      }));
}

function buildCachedSummaries(
  skills: Record<string, CachedSkill>,
  tools: Record<string, CachedTool>,
): {
  skillSummaries: SkillSummary[];
  toolSummaries: ToolSummary[];
  routingMetadata: string;
} {
  const skillSummaries: SkillSummary[] =
    Object.values(skills).map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      tools: skill.tools,
      subSkills: skill.subSkills,
    }));

  const toolSkillMap = new Map<string, string[]>();

  for (const skill of Object.values(skills)) {
    for (const tool of skill.tools) {
      const entries = toolSkillMap.get(tool) ?? [];
      entries.push(skill.id);
      toolSkillMap.set(tool, entries);
    }
  }

  const toolSummaries: ToolSummary[] =
    Object.values(tools).map((tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      skills: toolSkillMap.get(tool.name) ?? [],
      input: tool.input,
    }));

  const routingMetadata = JSON.stringify(
    {
      skills: skillSummaries.map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        tools: skill.tools,
        subSkills: skill.subSkills,
      })),
      tools: Object.values(tools).map((tool) => ({
        name: tool.name,
        description: tool.description ?? "",
        type: tool.type ?? null,
      })),
    },
    null,
    2,
  );

  return {
    skillSummaries,
    toolSummaries,
    routingMetadata,
  };
}

// ======================================================
// Registry
// ======================================================

async function buildRegistry(
  tree: GithubTree,
): Promise<SidebarAIRegistry> {
  const [system, skills, tools] = await Promise.all([
    loadSystemRules(tree.entries),
    loadSkills(tree.entries),
    loadTools(tree.entries),
  ]);

  const {
    skillSummaries,
    toolSummaries,
    routingMetadata,
  } = buildCachedSummaries(skills, tools);

  return {
    system,
    skills,
    tools,
    skillSummaries,
    toolSummaries,
    routingMetadata,
    treeSha: tree.sha,
    loadedAt: Date.now(),
  };
}

export async function getRegistry(
  forceRefresh = false,
): Promise<SidebarAIRegistry> {
  const now = Date.now();

  if (
    !forceRefresh &&
    registryCache &&
    now - registryCache.loadedAt < CACHE_TTL_MS
  ) {
    return registryCache;
  }

  if (registryPromise) {
    return registryPromise;
  }

  registryPromise = (async () => {
    const tree = await githubTree();

    if (
      registryCache &&
      registryCache.treeSha === tree.sha
    ) {
      registryCache = {
        ...registryCache,
        loadedAt: Date.now(),
      };

      return registryCache;
    }

    return buildRegistry(tree);
  })()
    .then((registry) => {
      registryCache = registry;
      return registry;
    })
    .finally(() => {
      registryPromise = null;
    });

  return registryPromise;
}

export async function getSkill(
  skillPath: string,
): Promise<CachedSkill | null> {
  if (!VALID_SKILL_PATH.test(skillPath)) {
    return null;
  }

  const registry = await getRegistry();
  return registry.skills[skillPath] ?? null;
}

export async function getTool(
  toolName: string,
): Promise<CachedTool | null> {
  if (!VALID_TOOL_NAME.test(toolName)) {
    return null;
  }

  const registry = await getRegistry();
  return registry.tools[toolName] ?? null;
}

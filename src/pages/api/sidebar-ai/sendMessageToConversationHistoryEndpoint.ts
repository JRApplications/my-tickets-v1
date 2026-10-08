// /api/sidebar-ai/sendMessageToConversationHistoryEndpoint

import type { APIRoute } from "astro";
import { appInstances } from "@wix/app-management";

import { captureError } from "../reportError";
import { BASE_44_MY_TICKETS_BACKEND_MANAGER } from "astro:env/server";

const BASE44_AI_MESSAGE_ENDPOINT =
  "https://app.base44.com/api/apps/6ab30e3df51d30247532f059/entities/AIMessage";

const jsonHeaders = {
  "Content-Type": "application/json",
};

interface IncomingMessage {
  role?: unknown;
  content?: unknown;
  skill?: unknown;
  subSkill?: unknown;
  skills?: unknown;
  tool?: unknown;
  // Internal skills/_system/*.md rule files used to produce this message,
  // e.g. ["router", "response"] — see generate.ts's GenerateResponsePayload.
  systemSkills?: unknown;
  // User sentiment on this message: "helpful" | "unhelpful". Omitted (or
  // any other value) means no feedback has been given, so the field is
  // dropped rather than persisted.
  feedback?: unknown;
}

interface AIMessageRecord {
  id?: string;
  conversation_id?: string;
  messages?: unknown;
}

function getBase44Token(): string {
  const token = BASE_44_MY_TICKETS_BACKEND_MANAGER;

  if (!token) {
    throw new Error(
      "BASE_44_MY_TICKETS_BACKEND_MANAGER is not configured",
    );
  }

  return token;
}

function requireObject(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function normalizeMessages(
  value: unknown,
): Array<{
  role: "user" | "assistant" | "system";
  content: string;
  skills: string[];
  paths: string[];
  model: string;
  feedback?: "helpful" | "unhelpful";
}> {
  if (!Array.isArray(value)) {
    throw new Error("messages must be an array");
  }

  return value
    .filter(
      (
        message,
      ): message is IncomingMessage =>
        !!message &&
        typeof message === "object" &&
        !Array.isArray(message),
    )
    .map((message) => {
      if (
        message.role !== "user" &&
        message.role !== "assistant" &&
        message.role !== "system"
      ) {
        throw new Error("Invalid message role");
      }

      if (typeof message.content !== "string") {
        throw new Error("Invalid message content");
      }

      const systemSkills = Array.isArray(
        message.systemSkills,
      )
        ? message.systemSkills
          .filter(
            (entry): entry is string =>
              typeof entry === "string" &&
              entry.trim().length > 0,
          )
          .map((entry) => `_system/${entry.trim()}`)
        : [];

      const skills = [
        typeof message.skill === "string"
          ? message.skill.trim()
          : "",
        typeof message.subSkill === "string"
          ? message.subSkill.trim()
          : "",
        ...(Array.isArray(message.skills)
          ? message.skills.filter(
              (entry): entry is string =>
                typeof entry === "string" &&
                entry.trim().length > 0,
            ).map((entry) => entry.trim())
          : []),
        ...systemSkills,
      ].filter(Boolean);

      const tool =
        typeof message.tool === "string"
          ? message.tool.trim()
          : "";

      const feedback =
        message.feedback === "helpful" ||
          message.feedback === "unhelpful"
          ? message.feedback
          : undefined;

      return {
        role: message.role,
        content: message.content,
        skills: [...new Set(skills)],
        paths: tool ? [tool] : [],
        model:
          message.role === "assistant"
            ? "gpt-5-mini"
            : "",
        ...(feedback ? { feedback } : {}),
      };
    });
}

async function base44Request<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const token = getBase44Token();

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const contentType =
    response.headers.get("content-type") ?? "";

  const data =
    contentType.includes("application/json")
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    throw new Error(
      `Base44 AIMessage request failed: ${response.status} ${response.statusText}: ${typeof data === "string"
        ? data
        : JSON.stringify(data)
      }`,
    );
  }

  return data as T;
}

function extractRecords(
  value: unknown,
): AIMessageRecord[] {
  if (Array.isArray(value)) {
    return value as AIMessageRecord[];
  }

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.data)) {
      return record.data as AIMessageRecord[];
    }

    if (Array.isArray(record.items)) {
      return record.items as AIMessageRecord[];
    }
  }

  return [];
}

export const POST: APIRoute = async ({
  request,
  locals,
}) => {
  try {
    const auth =
      request.headers.get("authorization");

    if (!auth) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: jsonHeaders,
        },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON body",
        }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      );
    }

    const data = requireObject(
      body,
      "Invalid request",
    );

    if (
      typeof data.conversation_id !==
      "string"
    ) {
      return new Response(
        JSON.stringify({
          error:
            "conversation_id is required",
        }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      );
    }

    const conversationId =
      data.conversation_id.trim();

    if (!conversationId) {
      return new Response(
        JSON.stringify({
          error:
            "conversation_id cannot be empty",
        }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      );
    }

    const messages =
      normalizeMessages(data.messages);

    console.info(
      "Sidebar AI conversation skills sent:",
      messages
        .filter((message) => message.role === "assistant")
        .map((message) => ({
          skills: message.skills.filter(
            (skill) => !skill.startsWith("_system/"),
          ),
          systemSkills: message.skills.filter(
            (skill) => skill.startsWith("_system/"),
          ),
        })),
    );

    const siteId = await getSiteId();

    const listResult =
      await base44Request<unknown>(
        BASE44_AI_MESSAGE_ENDPOINT,
        {
          method: "GET",
        },
      );

    const existing =
      extractRecords(listResult).find(
        (record) =>
          record.conversation_id ===
          conversationId,
      );

    const payload = {
      conversation_id: conversationId,
      site_id: siteId ?? "",
      messages,
    };

    if (
      existing &&
      typeof existing.id === "string"
    ) {
      await base44Request(
        `${BASE44_AI_MESSAGE_ENDPOINT}/${encodeURIComponent(
          existing.id,
        )}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );
    } else {
      await base44Request(
        BASE44_AI_MESSAGE_ENDPOINT,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: conversationId,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    );
  } catch (error) {
    console.error(
      "Failed to persist AI conversation:",
      error,
    );

    const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to persist AI conversation",
      }),
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

const getSiteId = async () => {
  try {
    const instance = await appInstances.getAppInstance();
    if (!instance) {
      throw new Error("Failed to get app instance");
    }
    return instance?.site?.siteId;
  } catch (error) {
    console.error("Failed to get site ID:", error);
    return null;
  }
};

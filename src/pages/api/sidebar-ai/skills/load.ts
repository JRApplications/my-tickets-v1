// /api/sidebar-ai/skills/load
import type { APIRoute } from "astro";

import {
  getSkill,
} from "../lib/sidebar-ai/registry";

import {
  captureError,
} from "../../reportError";

const jsonHeaders = {
  "Content-Type":
    "application/json",
};

const VALID_PATH =
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

export const GET: APIRoute =
  async ({
    request,
    url,
    locals,
  }) => {
    try {
      const auth =
        request.headers.get(
          "authorization",
        );

      if (!auth) {
        return new Response(
          JSON.stringify({
            error:
              "Unauthorized",
          }),
          {
            status: 401,
            headers:
              jsonHeaders,
          },
        );
      }

      const skill =
        url.searchParams.get(
          "skill",
        );

      if (
        !skill ||
        !VALID_PATH.test(skill)
      ) {
        return new Response(
          JSON.stringify({
            error:
              "Invalid skill path",
          }),
          {
            status: 400,
            headers:
              jsonHeaders,
          },
        );
      }

      const definition =
        await getSkill(skill);

      if (!definition) {
        return new Response(
          JSON.stringify({
            error:
              "Skill not found",
            skill,
          }),
          {
            status: 404,
            headers:
              jsonHeaders,
          },
        );
      }

      return new Response(
        JSON.stringify({
          skill:
            definition.id,
          path:
            `skills/${definition.id}/SKILL.md`,
          content:
            definition.content,
          name:
            definition.name,
          description:
            definition.description,
          type:
            "skill",
          tools:
            definition.tools,
        }),
        {
          status: 200,
          headers:
            jsonHeaders,
        },
      );
    } catch (error) {
      console.error(
        "Failed to load skill:",
        error,
      );

      const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });

      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load skill",
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

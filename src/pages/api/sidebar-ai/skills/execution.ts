// /api/sidebar-ai/skills/execution

import type { APIRoute } from "astro";

import {
  getRegistry,
} from "../lib/sidebar-ai/registry";

import {
  captureError,
} from "../../reportError";

const jsonHeaders = {
  "Content-Type":
    "application/json",
};

export const GET: APIRoute =
  async ({
    request,
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

      const registry =
        await getRegistry();

      return new Response(
        JSON.stringify({
          path:
            "skills/_system/EXECUTION.md",
          content:
            registry.system.execution,
        }),
        {
          status: 200,
          headers:
            jsonHeaders,
        },
      );
    } catch (error) {
      console.error(
        "Failed to load execution rules:",
        error,
      );

      const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });

      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "Failed to load execution rules",
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

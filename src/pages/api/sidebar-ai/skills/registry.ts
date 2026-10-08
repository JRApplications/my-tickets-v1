import type { APIRoute } from "astro";
import { captureError } from "../../reportError";

import {
  getRegistry,
  buildSkillSummaries,
  buildToolSummaries,
} from "../lib/sidebar-ai/registry";

const jsonHeaders = {
  "Content-Type": "application/json",
};

export const GET: APIRoute = async ({
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
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: jsonHeaders,
        },
      );
    }

    const refresh =
      new URL(request.url)
        .searchParams
        .get("refresh") === "true";

    const registry =
      await getRegistry(refresh);

    return new Response(
      JSON.stringify({
        skills:
          buildSkillSummaries(
            registry,
          ),

        tools:
          buildToolSummaries(
            registry,
          ),

        loadedAt:
          registry.loadedAt,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    );
  } catch (error) {
    console.error(
      "Failed to load Sidebar AI registry:",
      error,
    );

    const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to load registry",
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
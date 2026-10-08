import type { APIRoute } from "astro";
import {
  getTool,
} from "../lib/sidebar-ai/registry";
import { captureError } from "../../reportError";

const jsonHeaders = {
  "Content-Type": "application/json",
};

export const GET: APIRoute = async ({
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
          error: "Unauthorized",
        }),
        {
          status: 401,
          headers: jsonHeaders,
        },
      );
    }

    const name =
      url.searchParams.get("tool");

    if (
      !name ||
      !/^[a-zA-Z0-9_-]+$/.test(name)
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid tool",
        }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      );
    }

    // IMPORTANT:
    // getTool() is async.
    const tool =
      await getTool(name);

    if (!tool) {
      return new Response(
        JSON.stringify({
          error: "Tool not found",
          tool: name,
        }),
        {
          status: 404,
          headers: jsonHeaders,
        },
      );
    }

    return new Response(
      JSON.stringify({
        tool: tool.name,
        definition: tool,
        content: tool.content,
        path: tool.path,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    );
  } catch (error) {
    console.error(
      "Failed to load tool:",
      error,
    );

    const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to load tool",
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
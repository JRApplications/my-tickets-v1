import type { APIRoute } from "astro";
import { captureError } from "../../reportError";
import {
  getTool,
} from "../lib/sidebar-ai/registry";
import {
  buildToolUI,
} from "../lib/sidebar-ai/tool-ui";

const jsonHeaders = {
  "Content-Type": "application/json",
};

export const POST: APIRoute = async ({
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

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error:
            "Invalid JSON body",
        }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      );
    }

    if (
      !body ||
      typeof body !== "object"
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid request",
        }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      );
    }

    const tool =
      (body as {
        tool?: unknown;
      }).tool;

    if (
      typeof tool !== "string" ||
      !/^[a-zA-Z0-9_-]+$/.test(
        tool,
      )
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid tool",
        }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      );
    }

    const definition =
      await getTool(tool);

    if (!definition) {
      return new Response(
        JSON.stringify({
          error:
            "Tool not found",
        }),
        {
          status: 404,
          headers: jsonHeaders,
        },
      );
    }

    const ui =
      await buildToolUI(
        definition,
        request,
      );

    return new Response(
      JSON.stringify({
        tool,
        ui,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      },
    );
  } catch (error) {
    console.error(
      "Failed to build tool UI:",
      error,
    );

    const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to build tool UI",
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
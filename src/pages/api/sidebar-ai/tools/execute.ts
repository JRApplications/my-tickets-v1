import type { APIRoute } from "astro";
import {
  getTool,
} from "../lib/sidebar-ai/registry";
import { captureError } from "../../reportError";

const jsonHeaders = {
  "Content-Type": "application/json",
};

function isArgumentsObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

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

    const data =
      body as {
        tool?: unknown;
        arguments?: unknown;
      };

    if (
      typeof data.tool !== "string" ||
      !/^[a-zA-Z0-9_-]+$/.test(
        data.tool,
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

    const tool =
      await getTool(
        data.tool,
      );

    if (!tool) {
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

    if (!tool.endpoint) {
      return new Response(
        JSON.stringify({
          error:
            "Tool does not have an executable endpoint",
        }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      );
    }

    const args =
      data.arguments ?? {};

    if (
      !isArgumentsObject(args)
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Tool arguments must be an object",
        }),
        {
          status: 400,
          headers: jsonHeaders,
        },
      );
    }

    const endpoint =
      tool.endpoint;

    if (
      !/^\/api\/[a-zA-Z0-9/_-]+$/.test(
        endpoint.path,
      )
    ) {
      throw new Error(
        "Invalid trusted tool endpoint",
      );
    }

    const url =
      new URL(
        endpoint.path,
        request.url,
      );

    const fetchOptions: RequestInit = {
      method: endpoint.method,
      headers: {
        Authorization: auth,
        "Content-Type":
          "application/json",
      },
    };

    if (
      endpoint.method === "GET"
    ) {
      for (
        const [
          key,
          value,
        ] of Object.entries(args)
      ) {
        if (
          value === undefined ||
          value === null
        ) {
          continue;
        }

        if (
          typeof value ===
            "object"
        ) {
          url.searchParams.set(
            key,
            JSON.stringify(value),
          );
        } else {
          url.searchParams.set(
            key,
            String(value),
          );
        }
      }
    } else {
      fetchOptions.body =
        JSON.stringify(args);
    }

    const response =
      await fetch(
        url,
        fetchOptions,
      );

    const contentType =
      response.headers.get(
        "content-type",
      ) ?? "";

    let result: unknown;

    if (
      contentType.includes(
        "application/json",
      )
    ) {
      result =
        await response.json();
    } else {
      result =
        await response.text();
    }

    return new Response(
      JSON.stringify({
        success:
          response.ok,
        tool: tool.name,
        status:
          response.status,
        data: result,
      }),
      {
        status: response.ok
          ? 200
          : response.status,
        headers: jsonHeaders,
      },
    );
  } catch (error) {
    console.error(
      "Sidebar AI tool execution failed:",
      error,
    );

    const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Tool execution failed",
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
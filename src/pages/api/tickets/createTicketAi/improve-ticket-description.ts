import type { APIRoute } from 'astro';
import { captureError } from '../../reportError';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const auth = request.headers.get("authorization");
        const { description } = await request.json();

        const requestGenerateUrl =
            new URL(
                "/api/mini-ai/targeted-generate",
                request.url,
            );

        if (!auth) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        const fetchResponse =
            await fetch(requestGenerateUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": auth,
                },

                body: JSON.stringify({
                    folder: 'ticket-creation/ticket-description',
                    prompt: `Improve the following ticket description by using the ticket description skill: ${description}`
                }),
            });

        if (!fetchResponse.ok) {
            return new Response(JSON.stringify({ error: "Failed to improve ticket description" }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        const improvedDescription = await fetchResponse.json();


        return new Response(JSON.stringify({ improvedDescription: improvedDescription.text }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'x-mytickets-request-id': requestId,
            },
        });
    }
};
import type { APIRoute } from 'astro';
import { captureError } from '../../reportError';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const auth = request.headers.get("authorization");
        const { description, subject } = await request.json();

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
                    folder: 'ticket-creation/ticket-tags',
                    prompt: `Generate suitable tags for the following ticket description and subject: 
                    
                    ${description} 
                    
                    ${subject}

                    ONLY provide the tags separated by commas in a string array format.
                    
                    `
                }),
            });

        if (!fetchResponse.ok) {
            return new Response(JSON.stringify({ error: "Failed to generate ticket tags" }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }

        const generatedTags = await fetchResponse.json();
        const parsedTags = JSON.parse(generatedTags.text);

        return new Response(JSON.stringify({ generatedTags: parsedTags }), {
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
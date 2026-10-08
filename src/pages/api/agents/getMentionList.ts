import type { APIRoute } from 'astro';
import { captureError } from '../reportError';
import type { Agent } from '@jrapps/my_tickets_common_types';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500
    try {
        const requestUrl = new URL("/api/agents/get", request.url);
        const auth = request.headers.get("Authorization");
        if (!auth) {
            status = 401;
            throw new Error('Authorization header missing');
        }
        const response = await fetch(requestUrl, {
            method: "GET",
            headers: request.headers,
        });
        const result = await response.json();
        const formattedResult = result.agents.map((item: Agent) => ({
            id: item._id,
            name: item.name,
            teamName: item.team.name,
            teamId: item.team._id
        }));

        return new Response(JSON.stringify({ success: true, agents: formattedResult }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error fetching mentions' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};
import type { APIRoute } from 'astro';
import { captureError } from '../reportError';
import { HEADER_NAME, verifyToken } from './token';

// Introspection endpoint: verifies the token and returns the trusted identity
// encoded in it (agentId, teamId, roleId) — the source of truth other
// endpoints should use instead of trusting a client-supplied agentId.
export const GET: APIRoute = async ({ request, locals }) => {
    let status = 401;
    try {
        const token = request.headers.get(HEADER_NAME);
        if (!token) {
            throw new Error('Missing my-tickets-auth token');
        }

        const identity = await verifyToken(token);
        return new Response(JSON.stringify({ success: true, identity }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Invalid or expired auth token' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

import type { APIRoute } from 'astro';
import { captureError } from '../reportError';
import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { isSystemAdmin } from '../auth/system-admin';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const agentId = locals.myTicketsIdentity?.agentId;
        if (!agentId) {
            status = 400;
            throw new Error("Agent ID is required");
        }

        if (isSystemAdmin(agentId)) {
            return new Response(JSON.stringify({ success: true, notifications: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const agent = await items.get(CollectionIds.AGENTS, agentId, { consistentRead: true });
        if (!agent) {
            status = 404;
            throw new Error("Agent not found");
        }

        const { notifications }= agent;

        return new Response(JSON.stringify({ success: true, notifications: notifications ?? [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error fetching notifications' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

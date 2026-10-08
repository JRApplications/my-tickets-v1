import type { APIRoute } from "astro";
import { items as wixData } from '@wix/data';
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { SYSTEM_ADMIN_NAME, isSystemAdmin } from '../auth/system-admin';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const agentId = url.searchParams.get('id');
        if (!agentId) {
            status = 400;
            throw new Error("Agent ID is required");
        }

        if (isSystemAdmin(agentId)) {
            return new Response(JSON.stringify({ success: true, name: SYSTEM_ADMIN_NAME }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const response = await wixData.get(CollectionIds.AGENTS, agentId);
        if (!response) {
            status = 404;
            throw new Error("Agent not found");
        }
        return new Response(JSON.stringify({ success: true, name: response?.name || '' }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
            const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
            return new Response(JSON.stringify({ success: false, error: 'Error fetching agent name' }), {
                "status": status,
                headers: {
                    "Content-Type": "application/json",
                    "x-mytickets-request-id": requestId
                },
            });
        }
};
            

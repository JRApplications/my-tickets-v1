import type { APIRoute } from "astro";
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { CollectionIds } from "@jrapps/my_tickets_common_types";

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const data = await request.json();
        const { mailId, agentId } = data;
        const authToken = request.headers.get('Authorization');
        const checkPermission1 = await checkPermission(authToken, ["ADMIN", "USER"]);
        if (!checkPermission1) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        if (!mailId || !agentId) {
            status = 400;
            throw new Error('Missing mailId or agentId parameter');
        }

        const elevatedPatch = auth.elevate(items.patch);
        const updatedItem = await elevatedPatch(CollectionIds.CHAT_CONVERSATIONS, mailId).appendToArray('metaData.agentsRead', agentId).run();
        if (!updatedItem) {
            status = 500;
            throw new Error('Failed to mark as read');
        }
        return new Response(JSON.stringify({ success: true, item: updatedItem }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'An error occurred while marking as read' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
}

import type { APIRoute } from 'astro';
import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { captureError } from './../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const { mailId, agentId } = await request.json();

        if (!mailId || !agentId) {
            return new Response(JSON.stringify({ success: false, error: 'Missing mailId or agentId' }), { status: 400 });
        }

        const elevatedGet = auth.elevate(items.get);
        const isItem = await elevatedGet(CollectionIds.CHAT_CONVERSATIONS, mailId);
        if (!isItem) {
            return new Response(JSON.stringify({ success: false, error: 'Mail item not found' }), { status: 404 });
        }

        const elevatedPatch = auth.elevate(items.patch);
        await elevatedPatch(CollectionIds.CHAT_CONVERSATIONS, mailId).appendToArray('metaData.agentsDeleted', agentId).run();

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error deleting internal mail' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};
// site endpoint for checking connection
import type { APIRoute } from 'astro';
import { captureError } from '../reportError';
import { auth } from '@wix/essentials';
import { publisher } from '@wix/realtime';
import { getOwnedConversation } from './conversation-auth';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const { conversationId } = await request.json();
        const elevatedPublish = auth.elevate(publisher.publish);
        const channel = {
            "name": 'SITE_LIVE_CHAT_CONNECTION_CHECKER',
            "resourceId": conversationId,
        }
        await getOwnedConversation(conversationId);

        await elevatedPublish(channel, { connection: true });
        return new Response(JSON.stringify({ success: true, data: { conversationId } }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, message: error.message, requestId }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

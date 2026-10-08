import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { publisher } from '@wix/realtime';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@wix/essentials';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { captureError } from '../reportError';
import { patchConversation } from '../chat/conversation-auth';
import { SYSTEM_ADMIN_NAME, isSystemAdmin } from '../auth/system-admin';

const elevatedGetAgent = auth.elevate(items.get);

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const { conversationId, message, attachments = [] } = await request.json();
        const agentId = locals.myTicketsIdentity?.agentId;
        if (!agentId) return new Response(JSON.stringify({ success: false, error: 'Authenticated agent identity is required' }), { status: 401 });
        const elevatedPublish = auth.elevate(publisher.publish);
        const channel = {
            "name": 'SITE_LIVE_CHAT',
            "resourceId": conversationId,
        }

        const agentName = await getAgentName(agentId);
        const itemToAppend = {
            timestamp: Date.now(),
            _id: uuidv4(),
            senderName: agentName,
            conversationId,
            senderId: agentId,
            message: message,
            attachment: Array.isArray(attachments) ? attachments : [],
            senderType: 'agent',
        };
        await patchConversation(CollectionIds.CHAT_CONVERSATIONS, conversationId).appendToArray('messages', itemToAppend).run();
        await elevatedPublish(channel, {message, messageType: 'message'});
        return new Response(JSON.stringify({ success: true, message: 'Test POST request successful', data: { conversationId } }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, message: 'Test POST request failed', error: error.message, requestId }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

const getAgentName = async (agentId: string): Promise<string> => {
    try {
        if (isSystemAdmin(agentId)) return SYSTEM_ADMIN_NAME;
        const agentItem = await elevatedGetAgent(CollectionIds.AGENTS, agentId);
        return agentItem?.name ?? 'Unknown Agent';
    } catch (error: any) {
        console.error(`Failed to get agent name for agentId ${agentId}:`, error);
        return 'Unknown Agent';
    }
};

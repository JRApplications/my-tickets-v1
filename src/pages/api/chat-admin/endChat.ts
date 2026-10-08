import type { APIRoute } from 'astro';
import { captureError } from '../reportError';
import { v4 as uuidv4 } from 'uuid';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { publisher } from '@wix/realtime';
import { auth } from '@wix/essentials';
import { getConversation, patchConversation } from '../chat/conversation-auth';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const { conversationId } = await request.json();
        const agentId = locals.myTicketsIdentity?.agentId;
        if (!agentId) return new Response(JSON.stringify({ success: false, error: 'Authenticated agent identity is required' }), { status: 401 });
        const item = await getConversation(CollectionIds.CHAT_CONVERSATIONS, conversationId);
        if (!item) {
            return new Response(JSON.stringify({ error: 'Chat conversation not found' }), { status: 404 });
        }

        const toInsert = {
            timestamp: Date.now(),
            _id: uuidv4(),
            senderName: 'system',
            conversationId,
            senderId: agentId,
            message: 'CHAT_ENDED',
            attachment: [],
            senderType: 'system',
        };

        await patchConversation(CollectionIds.CHAT_CONVERSATIONS, conversationId).appendToArray('messages', toInsert).setField('metaData.currentAgentId', null).setField('metaData.currentTeamId', null).run();
        const elevatedPublish = auth.elevate(publisher.publish);
        const channel = {
            name: 'SITE_LIVE_CHAT',
            resourceId: conversationId,
        };
        await elevatedPublish(channel, { message: 'CHAT_ENDED', messageType: 'message' });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        console.error('Failed to end chat:', error);
        return new Response(JSON.stringify({ error: 'Failed to end chat', requestId }), { status: 500, headers: { 'x-mytickets-request-id': requestId } });
    }
}

import type { APIRoute } from 'astro';
import { auth } from '@wix/essentials';
import { publisher } from '@wix/realtime';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { captureError } from '../reportError';
import { getOwnedConversation, patchConversation } from './conversation-auth';

const elevatedPublish = auth.elevate(publisher.publish);

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const { conversationId } = await request.json();
        if (typeof conversationId !== 'string' || !conversationId) {
            return new Response(JSON.stringify({ success: false, error: 'Conversation ID is required' }), { status: 400 });
        }

        await getOwnedConversation(conversationId);

        const endedMessage = {
            timestamp: Date.now(),
            _id: crypto.randomUUID(),
            senderName: 'system',
            conversationId,
            senderId: 'system',
            message: 'CHAT_ENDED',
            attachment: [],
            senderType: 'system',
        };

        await patchConversation(CollectionIds.CHAT_CONVERSATIONS, conversationId)
            .appendToArray('messages', endedMessage)
            .setField('metaData.currentAgentId', null)
            .setField('metaData.currentTeamId', null)
            .run();

        await elevatedPublish(
            { name: 'SITE_LIVE_CHAT', resourceId: conversationId },
            { message: 'CHAT_ENDED', messageType: 'system' },
        );

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        console.error('Failed to end site chat:', error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to end chat', requestId }), {
            status: error?.status && Number.isInteger(error.status) ? error.status : 500,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

import type { APIRoute } from 'astro';
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { getConversation } from '../chat/conversation-auth';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const conversationId = url.searchParams.get('conversationId');
        if (!conversationId) {
           status = 400;
           throw new Error('Missing conversationId');
        }
        
        const conversationMessages = await getConversation(CollectionIds.CHAT_CONVERSATIONS, conversationId, { fields: ['messages','metaData.currentAgentId', 'metaData.siteUserName', 'metaData.siteUserType', 'metaData.siteUserId'], consistentRead: true });
        if (!conversationMessages) {
            status = 404;
            throw new Error('Conversation not found');
        }
        const memberId = conversationMessages.metaData?.siteUserType === 'member'
            ? conversationMessages.metaData.siteUserId || ''
            : '';
        return new Response(JSON.stringify({ success: true, data: { messages: conversationMessages?.messages || [], currentAgentId: conversationMessages?.metaData?.currentAgentId || null, userName: conversationMessages?.metaData?.siteUserName || '', userType: conversationMessages?.metaData?.siteUserType || '', memberId } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, message: 'Failed to get updated messages', error: error.message, requestId }), {
            status,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

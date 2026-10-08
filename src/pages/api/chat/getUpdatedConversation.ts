import type { APIRoute } from 'astro';
import { captureError } from '../reportError';
import { getOwnedConversation } from './conversation-auth';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const conversationId = url.searchParams.get('conversationId');
        if (!conversationId) {
           status = 400;
           throw new Error('Missing conversationId');
        }
        
        const conversationMessages = await getOwnedConversation(conversationId);
        if (!conversationMessages) {
            status = 404;
            throw new Error('Conversation not found');
        }
        return new Response(JSON.stringify({ success: true, data: conversationMessages }), {
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

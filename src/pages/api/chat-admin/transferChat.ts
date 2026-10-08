import type { APIRoute } from 'astro';
import { captureError } from '../reportError';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { publisher } from '@wix/realtime';
import { getConversation } from '../chat/conversation-auth';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const { conversationId, teamId } = await request.json();
        const agentId = locals.myTicketsIdentity?.agentId;
        if (!agentId) return new Response(JSON.stringify({ success: false, error: 'Authenticated agent identity is required' }), { status: 401 });

        if (!conversationId || !teamId) return new Response(JSON.stringify({ success: false, error: 'Conversation ID and Team ID are required' }), { status: 400 });

        const conversation = await getConversation(CollectionIds.CHAT_CONVERSATIONS, conversationId, {
            fields: ['metaData.currentTeamId'],
            consistentRead: true,
        });
        if (!conversation) return new Response(JSON.stringify({ success: false, error: 'Chat conversation not found' }), { status: 404 });

        const currentTeamId = conversation.metaData?.currentTeamId;
        const elevatedPatch = auth.elevate(items.patch);
        const result = await elevatedPatch(CollectionIds.CHAT_CONVERSATIONS, conversationId).setField('metaData.currentTeamId', teamId).run();

        if (!result) return new Response(JSON.stringify({ success: false, error: 'Failed to transfer chat' }), { status: 500 });

        await publishToTeam(teamId);
        if (currentTeamId && currentTeamId !== teamId) await publishToTeam(currentTeamId);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        console.error('Failed to transfer chat:', error);
        return new Response(JSON.stringify({ error: 'Failed to transfer chat', requestId }), { status: 500, headers: { 'x-mytickets-request-id': requestId } });
    }
};

const publishToTeam = async (teamId: string) => {
    try {
    const elevatedPublish = auth.elevate(publisher.publish);
    await elevatedPublish({ name: 'SITE_LIVE_CHAT_TEAM', resourceId: teamId}, { ping: true });
    } catch (error) {
        console.error('Failed to publish to team:', error);
    }
};
import type { APIRoute } from 'astro';
import { getGeneralTeamId, isAiRoutingEnabled, getAvailableTeams } from './utils';
import { captureError } from '../reportError';
import { generateText } from 'ai';
import { publisher } from '@wix/realtime';
import { auth } from '@wix/essentials';
import { openAiClient } from '../aiUtils/aiClient';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { getOwnedConversation, patchConversation } from './conversation-auth';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const { conversationId } = await request.json();
        if (typeof conversationId !== 'string' || !conversationId) throw new Error('Conversation ID is required');
        // Validate ownership and load the conversation once. AI routing needs
        // its messages, so reuse this read instead of fetching them again.
        const conversation = await getOwnedConversation(conversationId);

        // These settings are independent reads from the same config item.
        // Fetch them together so their network latency doesn't stack up.
        const [generalTeamId, isAiEnabled, availableTeams] = await Promise.all([
            getGeneralTeamId(),
            isAiRoutingEnabled(),
            getAvailableTeams(),
        ]);
        if (isAiEnabled) {
            const team = await getTeamByAiRouting(availableTeams, generalTeamId, conversation);
            if (team && team._id) {
                await sendConversationToTeam(conversationId, team._id);
            }
        } else {
            await sendConversationToTeam(conversationId, generalTeamId);
        }
        await insertWaitingForAgent(conversationId, request);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        console.error("Failed to set waiting for agent", error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message ,
        }), { status: 500, headers: { 'x-mytickets-request-id': requestId } });
    }
};

const sendConversationToTeam = async (conversationId: string, teamId: string) => {
    try {
        await patchConversation(CollectionIds.CHAT_CONVERSATIONS, conversationId).setField('metaData.currentTeamId', teamId).run();
        const channel = {
            name: "SITE_LIVE_CHAT_TEAM",
            resourceId: teamId
        }
        const elevatedPublish = auth.elevate(publisher.publish);
        return await elevatedPublish(channel, { conversationId });
    } catch (error: any) {
        console.error("Failed to send conversation to team", error);
    }
}

const getTeamByAiRouting = async (availableTeams: any[], generalTeamId: string, conversation: any) => {
    try {
        const { messages } = conversation?.data;
        // Routing only needs each message's role and text. Conversation IDs,
        // timestamps, sender names, and attachment URLs add prompt tokens but
        // don't help choose a team.
        const routingMessages = (messages ?? []).map((message: any) => ({
            senderType: message.senderType,
            message: message.message ?? (message.attachment?.length ? '[attachment]' : ''),
        }));
        const { text } = await generateText({
            model: await openAiClient("gpt-4.1-nano"),
            maxOutputTokens: 50,
            prompt: `
                Route this customer messages to the best team. 
                If the message is in a array form then look at the sender type and the message to get a idea of the conversation.
                Return ONLY JSON: { "_id": "<team_id>" }
                Teams:
                ${JSON.stringify(availableTeams)}
                Default if unsure: { "_id": "${generalTeamId}" }
                Message: ${JSON.stringify(routingMessages)}
            `,
        });
        return typeof text === 'string' ? JSON.parse(text) : text;
    } catch (error) {
        console.error("Failed to get team by AI routing", error);
    }
};


const insertWaitingForAgent = async (conversationId: string, request: any) => {
    try {
        const auth =
            request.headers.get(
                "authorization",
            );

        const url =
            new URL(
                "/api/chat/sendMessage",
                request.url,
            );

        await fetch(url.toString(), {
            method: "POST",
            headers: {
                "authorization": auth,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                conversationId,
                message: "WAITING_FOR_AGENT",
                messageType: "system"
            })
        });
    } catch (error) {
        console.error("Failed to insert waiting for agent", error);
    }
};

import type { APIRoute } from 'astro';
import { getPlanLimitStatus } from '../utils/plan-limits';

export const VISITOR_CHAT_LIMIT_MESSAGE = 'Live chat is unavailable right now. Please try again later or contact us another way.';

// Lightweight check the chat widget calls when a visitor clicks Start chat, before they join a conversation.
// Fails open: if the plan cannot be read the visitor can chat. Paid sites are never limited on chats.
export const GET: APIRoute = async () => {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
    try {
        const status = await getPlanLimitStatus('chatConversations');
        if (status.reached) {
            return new Response(JSON.stringify({ success: true, available: false, message: VISITOR_CHAT_LIMIT_MESSAGE }), { headers });
        }
    } catch (error) {
        console.error('Could not check chat availability', error);
    }
    return new Response(JSON.stringify({ success: true, available: true }), { headers });
};

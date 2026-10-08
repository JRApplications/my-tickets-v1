import type { APIRoute } from 'astro';
import { members } from '@wix/members';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { randomUUID } from 'node:crypto';
import { auth } from '@wix/essentials';
import { captureError } from '../reportError';
import { insertConversation } from './conversation-auth';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const tokenInfo = await auth.getTokenInfo();
        if (!tokenInfo?.subjectId || !tokenInfo?.subjectType) {
            throw new Error('Site identity is required to create a conversation');
        }
        const user = await getUser(tokenInfo);

        const conversationId = randomUUID();
        const metaData = {
            "channel": "SITE_LIVE_CHAT",
            "siteUserType": user.userType.toLowerCase(),
            "status": "open",
            "conversationId": conversationId,
            "createdAt": Date.now(),
            "siteUserId": user.userId,
            "siteUserName": user.userName,
        };

        await insertConversation(CollectionIds.CHAT_CONVERSATIONS, {
            _id: conversationId,
            metaData,
            channel: "SITE_LIVE_CHAT",
            messages: [],
        });

        return new Response(JSON.stringify({ success: true, conversationId }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to handle POST request'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

const getUser = async (tokenInfo: any) => {
    try {
        const user = {
            userId: tokenInfo.subjectId,
            userType: tokenInfo.subjectType
        }

        // Skip the Members API entirely for guests.
        if (user.userType !== 'MEMBER') {
            return { ...user, userName: `Visitor #${user.userId.slice(0, 5)}` };
        }

        const options = {
            fieldsets: ['FULL']
        }
        // @ts-ignore
        let member = await members.getMember(user.userId, options);
        if (!member) {
            throw new Error('Member not found');
        }
        let memberName = `${member?.contact?.firstName || ''} ${member?.contact?.lastName || ''}`.trim();
        return { ...user, userName: memberName };
    } catch (error: any) {
        console.error("Failed to get user", error);
        throw error;
    }
}

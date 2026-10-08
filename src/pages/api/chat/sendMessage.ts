import type { APIRoute } from 'astro';
import { CollectionIds, type RealtimeChatMessage  } from '@jrapps/my_tickets_common_types';
import { captureError } from '../reportError';
import { members } from '@wix/members';
import { auth } from '@wix/essentials';
import { publisher } from '@wix/realtime';
import { getOwnedConversation, patchConversation } from './conversation-auth';

// Hoisted so it isn't recreated on every request
const elevatedPublish = auth.elevate(publisher.publish);

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const { message, attachments, conversationId, messageType } = await request.json();
        if (typeof conversationId !== 'string' || !conversationId || typeof messageType !== 'string') {
            return new Response(JSON.stringify({ success: false, message: 'Invalid chat request' }), { status: 400 });
        }
        await getOwnedConversation(conversationId);

        const channel = { name: 'SITE_LIVE_CHAT', resourceId: conversationId };
        if (messageType === 'typing') {
            await elevatedPublish(channel, { messageType: 'typing' });
            return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        }
        if (!['message', 'questionMessage', 'system'].includes(messageType)) {
            return new Response(JSON.stringify({ success: false, message: 'Unsupported message type' }), { status: 400 });
        }

        const tokenInfo = messageType === 'questionMessage' ? null : await auth.getTokenInfo();
        const details = messageType === 'questionMessage'
            ? { senderName: '', senderId: 'agent', senderType: 'agent' as const }
            : messageType === 'system'? {senderName: '', senderId: 'system', senderType: 'system' as const} : await getSenderDetails(tokenInfo!.subjectId, tokenInfo!.subjectType);
        const chatMessage: RealtimeChatMessage = {
            timestamp: Date.now(),
            _id: crypto.randomUUID(),
            senderName: details.senderName,
            conversationId,
            senderId: details.senderId,
            message,
            attachment: attachments,
            senderType: details.senderType,
        };

        await patchConversation(CollectionIds.CHAT_CONVERSATIONS, conversationId)
            .appendToArray('messages', chatMessage)
            .run();
        await elevatedPublish(channel, { message, messageType });

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, message: error.message, requestId }), {
            status: error?.status && Number.isInteger(error.status) ? error.status : 500,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

const getSenderDetails = async (userId: string, userType: string) => {
    if (userType === 'MEMBER') {
        const currentMember = await members.getCurrentMember({ fieldsets: 'FULL' } as any);
        const memberId = currentMember.member?._id;
        const memberName = `${currentMember.member?.contact?.firstName ?? ''} ${currentMember.member?.contact?.lastName ?? ''}`.trim();
        if (!currentMember || !memberId || !memberName) {
            throw new Error('User not authenticated');
        }
        return {
            senderId: memberId,
            senderName: memberName,
            senderType: 'member' as RealtimeChatMessage['senderType'],
        };
    }

    if (userType === 'VISITOR') {
        return {
            senderId: userId,
            senderName: 'Visitor',
            senderType: 'visitor' as RealtimeChatMessage['senderType'],
        };
    }

    throw new Error('Unsupported user type');
};

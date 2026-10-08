import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { type Notification as NotificationType, CollectionIds } from "@jrapps/my_tickets_common_types";
import { v4 as uuidv4 } from 'uuid';
import { publisher } from '@wix/realtime';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { randomUUID } from 'crypto';
import { SYSTEM_ADMIN_EMAIL, SYSTEM_ADMIN_ID, SYSTEM_ADMIN_NAME, isSystemAdmin } from '../auth/system-admin';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const data = await request.json();
        const { message, attachments, mailId } = data;
        const agentId = locals.myTicketsIdentity?.agentId;
        if (!agentId) {
            status = 401;
            throw new Error('Authenticated agent identity is required');
        }
        const authToken = request.headers.get('Authorization');
        const checkPermission1 = await checkPermission(authToken, ["ADMIN", "USER"]);
        if (!checkPermission1) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        const elevatedGet = auth.elevate(items.get);
        const user = isSystemAdmin(agentId)
            ? { _id: SYSTEM_ADMIN_ID, name: SYSTEM_ADMIN_NAME, email: SYSTEM_ADMIN_EMAIL }
            : await elevatedGet(CollectionIds.AGENTS, agentId);
        const updateMetaData = {
            _id: user?._id,
            email: user?.email,
            name: user?.name,
            timestamp: Date.now(),
        }

        const toInsert = {
            _id: uuidv4(),
            mailId: mailId,
            senderId: agentId,
            senderEmail: user?.email,
            senderName: user?.name,
            message: message || '',
            timestamp: Date.now(),
            attachments: attachments || [],
        }
        const elevatedPatch = auth.elevate(items.patch);
        // a new reply resets read status so only the replier is marked read
        const toPatch = await elevatedPatch(CollectionIds.CHAT_CONVERSATIONS, mailId).setField('metaData.agentFrom', updateMetaData).setField('metaData.agentsRead', [agentId]).appendToArray('messages', toInsert).setField('metaData.agentsDeleted', []).run();
        if (!toPatch) {
            status = 500;
            throw new Error('Failed to update mail conversation');
        }
        // the reply is already saved, so a notification failure must not fail this request
        const notifyIds = [
            ...(toPatch.metaData.agentsTo as string[]).filter((id: string) => id !== agentId),
            ...(toPatch.metaData.teamsTo as string[] ?? [])
        ];

        await sendRealtimeUpdate(mailId, notifyIds);
        await sendRealtimeUpdate(toInsert._id, notifyIds);
        const mentions = getMentions(message);
        if (mentions.length > 0) {
            await sendRealtimeNotifications(mentions, request.url, authToken, request.headers.get('x-my-tickets-auth') || '');
        }

        return new Response(JSON.stringify({ success: true, updatedConversation: toPatch }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'An error occurred while sending the new mail message' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

const getMentions = (message: string): string[] => {
    const mentionRegex = /\[@\{"name":"([^"]+)","id":"([^"]+)","teamName":"([^"]+)","teamId":"([^"]+)"\}\]/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(message)) !== null) {
        mentions.push(match[2]); // push the id of the mentioned user
    }
    return mentions;
};

const sendRealtimeNotifications = async (mentions: string[], baseUrl: string, auth: any, agentAuthToken: string) => {
    try {
        const notification: NotificationType = { id: randomUUID(), title: `Internal Mail`, subtitle: 'You received a new internal mail that mentions you.' };

        await Promise.all(
            mentions.map(async (toId) => {
                const fetchUrl = new URL(
                    "/api/notifications/sendNotification",
                    baseUrl,
                );
                const response = await fetch(fetchUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `${auth}`,
                        'x-my-tickets-auth': agentAuthToken,
                    },
                    body: JSON.stringify({ agentId: toId, notification })
                });
                if (!response.ok) {
                    throw new Error(`Failed to send notification to agent ${toId}`);
                }
                return response;
            })
        );
    } catch (error) {
        throw error;
    }
};

const sendRealtimeUpdate = async (mailId: string, toIds: string[]): Promise<void> => {
    if (!mailId || !toIds || toIds.length === 0) {
        return;
    }
    const elevatedPublish = auth.elevate(publisher.publish);
    await Promise.all(
        toIds.map((toId) =>
            elevatedPublish({ name: 'INTERNAL_MAIL', resourceId: toId }, { mailId })
        )
    );
};

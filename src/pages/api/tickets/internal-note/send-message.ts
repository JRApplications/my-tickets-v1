import type { APIRoute } from "astro";
import { items as wixData } from '@wix/data';
import { randomUUID } from 'node:crypto';
import { sanitizeText } from '../../utils/sanitize';
// import type { MessageProps } from '@jrapps/my_tickets_common_types';
interface MessageProps {
    [key: string]: any;
}
import { captureError } from '../../reportError';
import { CollectionIds, type Notification as NotificationType } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../../auth/checkPermission';

export const PUT: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const requestAuth = request.headers.get("Authorization");
        if (!(await checkPermission(requestAuth, ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        const body = await request.json();

        const { ticketId, message, attachment, agentId, agentName, messageType } = body;
        

        if (!ticketId || !agentId || !agentName || !messageType) {
            status = 400;
            throw new Error('Missing required fields: ticketId, message, agentId, agentName, messageType');
        }

        const ticketUpdate: MessageProps = {
            _id: randomUUID(),
            ticketId,
            timestamp: Date.now(),
            senderType: 'agent',
            senderId: agentId,
            senderName: agentName,
            attachment,
            message: await sanitizeText(message)
        };

        const updatedItem = await wixData.bulkPatch(CollectionIds.TICKETS, [ticketId])
            .appendToArray("internalNotes", ticketUpdate)
            .run();

        if (!updatedItem) {
            status = 500;
            throw new Error('Failed to update ticket internal notes');
        }

        if (updatedItem.errors && updatedItem.errors.length > 0) {
            console.error('Errors during bulkPatch:', updatedItem.errors);
            status = 500;
            throw new Error(`Failed to update ticket internal notes due to errors. Code ${updatedItem.errors[0].code}`);
        }

        const item = await wixData.get(CollectionIds.TICKETS, ticketId, { consistentRead: true });
        if (!item) {
            status = 500;
            throw new Error('Failed to retrieve updated ticket after internal note update');
        }

        const mentions = getMentions(message);
        if (mentions.length > 0) {
            await sendRealtimeNotifications(
                mentions,
                request.url,
                requestAuth,
                request.headers.get('x-my-tickets-auth') || '',
                item.primaryTicketNumber,
            );
        }

        return new Response(JSON.stringify({ success: true, ticket: { internalNotes: item.internalNotes } }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to send internal note' }), {
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

const sendRealtimeNotifications = async (mentions: string[], baseUrl: string, auth: any, agentAuthToken: string, primaryTicketId: string) => {
    try {
        const notification: NotificationType = { id: randomUUID(), title: `Ticket Update: #${primaryTicketId}`, subtitle: 'You were mentioned in an internal note' };
        
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

import type { APIRoute } from "astro";
import { TimelineMessageType, type TimelineMessage, CollectionIds } from "@jrapps/my_tickets_common_types";
import { items as wixData } from '@wix/data';
import { randomUUID } from 'node:crypto';
import { captureError } from '../../reportError';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const body = await request.json();
        const { ticketId, message, type } = body;

        if (!ticketId || !message || !type || typeof message !== 'string' || !(Object.values(TimelineMessageType) as string[]).includes(type)) {
            status = 400;
            throw new Error(`Missing required fields or invalid message type: ${ticketId}, ${message}, ${type}`);
        }

        const ticketUpdate: TimelineMessage = {
            _id: randomUUID(),
            ticketId,
            timestamp: Date.now(),
            type: type as TimelineMessage['type'],
            message
        };

        const updatedItem = await wixData.bulkPatch(CollectionIds.TICKETS, [ticketId])
            .appendToArray("timeline", ticketUpdate)
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

        return new Response(JSON.stringify({ success: true, ticket: { timeline: item.timeline } }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to send timeline message' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};
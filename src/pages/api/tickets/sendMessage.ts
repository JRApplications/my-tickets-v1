import type { APIRoute } from "astro";
import { items as wixData } from '@wix/data';
import { randomUUID } from 'node:crypto';
import { sanitizeText } from '../utils/sanitize';
// import type { MessageProps } from '@jrapps/my_tickets_common_types';
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';
import { markSlaFirstResponse, runSlaHook } from '../utils/slaServer';

interface MessageProps {
    [key: string]: any;
}
export const PUT: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) {
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
            .appendToArray("communication", ticketUpdate)
            .run();

        if (!updatedItem) {
            status = 500;
            throw new Error('Failed to update ticket communication');
        }

        if (updatedItem.errors && updatedItem.errors.length > 0) {
            console.error('Errors during bulkPatch:', updatedItem.errors);
            status = 500;
            throw new Error(`Failed to update ticket communication due to errors. Code ${updatedItem.errors[0].code}`);
        }

        const item = await wixData.get(CollectionIds.TICKETS, ticketId, { consistentRead: true });
        if (!item) {
            status = 404;
            throw new Error('Failed to retrieve updated ticket after communication update');
        }
        await runSlaHook(() => markSlaFirstResponse(ticketId, ticketUpdate.timestamp));

        return new Response(JSON.stringify({ success: true, ticket: { communication: item.communication } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error sending message' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

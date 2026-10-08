import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth as elevatedAuth } from '@wix/essentials';
import { randomUUID } from 'node:crypto';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { CollectionIds, TimelineMessageType } from '@jrapps/my_tickets_common_types';
import { checkAgentPermission } from '../auth/checkAgentPermission';

export const PUT: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        const { ticketId, action, agentName, agentId } = await request.json();
        if (typeof ticketId !== 'string' || !ticketId || typeof agentId !== 'string' || !['spam', 'delete', 'restore'].includes(action)) {
            status = 400;
            throw new Error('Ticket ID and a valid action are required');
        }
        if (!(await checkAgentPermission(agentId, 'my-tickets-manage-ticket-disposition'))) {
            status = 403;
            throw new Error('Insufficient agent permissions');
        }
        const ticket = await items.get(CollectionIds.TICKETS, ticketId);
        if (!ticket) {
            status = 404;
            throw new Error('Ticket not found');
        }

        const isSpam = action === 'spam' ? true : action === 'restore' ? false : ticket.isSpam === true;
        const isDeleted = action === 'delete' ? true : action === 'restore' ? false : ticket.isDeleted === true;
        const type = action === 'spam'
            ? TimelineMessageType.TICKET_MARKED_SPAM
            : action === 'delete'
                ? TimelineMessageType.TICKET_DELETED
                : TimelineMessageType.TICKET_RESTORED;
        const actor = typeof agentName === 'string' && agentName.trim() ? agentName.trim().slice(0, 100) : 'An agent';
        const timelineMessage = action === 'spam' ? `${actor} marked this ticket as spam` : action === 'delete' ? `${actor} moved this ticket to deleted` : `${actor} restored this ticket`;

        const result = await elevatedAuth.elevate(items.bulkPatch)(CollectionIds.TICKETS, [ticketId])
            .setField('isSpam', isSpam)
            .setField('isDeleted', isDeleted)
            .appendToArray('timeline', { _id: randomUUID(), ticketId, timestamp: Date.now(), type, message: timelineMessage })
            .run();
        if (result?.errors?.length) throw new Error('Failed to update ticket');

        return new Response(JSON.stringify({ success: true, isSpam, isDeleted }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to update ticket' }), {
            status,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

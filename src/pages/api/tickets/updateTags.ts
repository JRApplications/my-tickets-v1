import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth as elevatedAuth } from '@wix/essentials';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { CollectionIds, TimelineMessageType } from '@jrapps/my_tickets_common_types';
import { randomUUID } from 'node:crypto';
import { checkAgentPermission } from '../auth/checkAgentPermission';

export const PUT: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const authToken = request.headers.get('Authorization');
        if (!(await checkPermission(authToken, ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient permissions');
        }

        const { ticketId, tags, agentId, agentName } = await request.json();
        if (typeof ticketId !== 'string' || !ticketId || !Array.isArray(tags) || typeof agentId !== 'string') {
            status = 400;
            throw new Error('Ticket ID and tag list are required');
        }
        if (!(await checkAgentPermission(agentId, 'my-tickets-manage-ticket-tags'))) {
            status = 403;
            throw new Error('Insufficient agent permissions');
        }

        const normalizedTags = Array.from(new Set(tags
            .filter((tag): tag is string => typeof tag === 'string')
            .map(tag => tag.trim().slice(0, 50))
            .filter(Boolean))).slice(0, 30);
        const ticket = await items.get(CollectionIds.TICKETS, ticketId);
        if (!ticket) {
            status = 404;
            throw new Error('Ticket not found');
        }

        const actor = typeof agentName === 'string' && agentName.trim() ? agentName.trim().slice(0, 100) : 'An agent';
        const updated = await elevatedAuth.elevate(items.bulkPatch)(CollectionIds.TICKETS, [ticketId])
            .setField('tags', normalizedTags)
            .appendToArray('timeline', {
                _id: randomUUID(),
                ticketId,
                timestamp: Date.now(),
                type: TimelineMessageType.TICKET_TAGS_CHANGED,
                message: `${actor} updated ticket tags`,
                agentId: typeof agentId === 'string' ? agentId : undefined,
            })
            .run();
        if (updated?.errors?.length) throw new Error('Failed to update ticket tags');

        return new Response(JSON.stringify({ success: true, tags: normalizedTags }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to update ticket tags' }), {
            status,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

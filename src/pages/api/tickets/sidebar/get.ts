import type { APIRoute } from "astro";
import { checkPermission } from '../../auth/checkPermission';
import { captureError } from '../../reportError';
import {
    createScopedTicketQuery,
    isVisibleSidebarTicket,
    mapSidebarTicket,
    readTicketListFilters,
    type SidebarTicket,
} from './query';
import { isSystemAdmin } from '../../auth/system-admin';

const PAGE_SIZE = 100;
const TICKET_FIELDS = [
    '_id',
    'primaryTicketNumber',
    'subject',
    'priority',
    'status',
    'memberName',
    'assignedAgent',
    'assignedTeam',
    'tags',
    'isSpam',
    'isDeleted',
    'sla',
    '_createdDate',
] as const;

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const identity = locals.myTicketsIdentity;
        if (!identity) {
            status = 401;
            throw new Error('My Tickets agent authentication is required');
        }
        if (!(await checkPermission(request.headers.get('Authorization'), ["ADMIN", "USER"]))) {
            status = 403;
            throw new Error('Insufficient Wix permissions');
        }

        const url = new URL(request.url);
        const teamId = url.searchParams.get('teamId');
        if (!teamId) {
            status = 400;
            throw new Error('Team ID is required');
        }
        if (!isSystemAdmin(identity.agentId) && teamId !== identity.teamId) {
            status = 403;
            throw new Error('Requested team is outside your access scope');
        }

        const rawCursor = url.searchParams.get('cursor') ?? '0';
        let offset = Number(rawCursor);
        if (!Number.isSafeInteger(offset) || offset < 0) {
            status = 400;
            throw new Error('Invalid ticket cursor');
        }

        const rawLimit = url.searchParams.get('limit');
        const requestedLimit = rawLimit === null ? PAGE_SIZE : Number(rawLimit);
        if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
            status = 400;
            throw new Error('Invalid ticket page size');
        }
        const pageSize = Math.min(requestedLimit, PAGE_SIZE);

        const filters = readTicketListFilters(url);
        const query = createScopedTicketQuery(identity, filters, teamId)
            .fields(...TICKET_FIELDS)
        const tickets: SidebarTicket[] = [];
        let hasMore = false;

        while (tickets.length < pageSize) {
            const result = await query
                .skip(offset)
                .limit(pageSize - tickets.length)
                .find({ returnTotalCount: false });
            const records = result.items;
            tickets.push(...records.map(mapSidebarTicket).filter((ticket) => isVisibleSidebarTicket(ticket, filters)));
            offset += records.length;
            hasMore = result.hasNext();
            if (!hasMore || records.length === 0) break;
        }

        return new Response(JSON.stringify({
            success: true,
            tickets,
            hasMore,
            nextCursor: hasMore ? String(offset) : null,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to fetch tickets' }), {
            status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId,
            },
        });
    }
};

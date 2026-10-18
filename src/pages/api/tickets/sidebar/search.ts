import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { captureError } from '../../reportError';
import {
    createScopedTicketQuery,
    isVisibleSidebarTicket,
    mapSidebarTicket,
    readTicketListFilters,
    type SidebarTicket,
} from './query';
import { checkPermission } from '../../auth/checkPermission';
import { members } from '@wix/members';

const PAGE_SIZE = 100;

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const identity = locals.myTicketsIdentity;
        if (!identity) {
            status = 401;
            throw new Error('My Tickets agent authentication is required');
        }
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient Wix permissions');
        }

        const url = new URL(request.url);
        const query = url.searchParams.get('query');
        if (!query) {
            status = 400;
            throw new Error('Query is required');
        }
        const boundedQuery = query.trim().slice(0, 100);
        if (!boundedQuery) {
            status = 400;
            throw new Error('Query is required');
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

        let memberIds: string[] = [];
        try {
            const memberSearch = await members.queryMembers({
                fieldsets: [members.Set.FULL],
                search: {
                    expression: boundedQuery,
                    fields: ['loginEmail', 'contact.firstName', 'contact.lastName', 'profile.nickname'],
                },
            }).find();
            memberIds = memberSearch.items.flatMap((member) =>
                typeof member._id === 'string' ? [member._id] : [],
            );
        } catch (error) {
            console.error('Member lookup failed during ticket search; continuing with ticket fields', error);
        }

        let searchFilter = items.filter()
            .eq('primaryTicketNumber', boundedQuery)
            .or(items.filter().contains('memberName', boundedQuery))
            .or(items.filter().contains('subject', boundedQuery));
        for (const memberId of memberIds) {
            searchFilter = searchFilter.or(items.filter().eq('memberId', memberId));
        }

        const filters = readTicketListFilters(url);
        const ticketSearch = createScopedTicketQuery(identity, filters, null).and(searchFilter);
        const tickets: SidebarTicket[] = [];
        let hasMore = false;

        while (tickets.length < pageSize) {
            const results = await ticketSearch
                .skip(offset)
                .limit(pageSize - tickets.length)
                .find({ returnTotalCount: false });
            const records = results.items;
            tickets.push(...records
                .map(mapSidebarTicket)
                .filter((ticket) => isVisibleSidebarTicket(ticket, filters)));
            offset += records.length;
            hasMore = results.hasNext();
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
        return new Response(JSON.stringify({ success: false, error: 'Error getting ticket' }), {
            status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId,
            },
        });
    }
};

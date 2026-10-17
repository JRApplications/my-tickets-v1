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

const SEARCH_PAGE_SIZE = 1000;
const TICKET_FIELDS = [
    '_id',
    'primaryTicketNumber',
    'subject',
    'priority',
    'status',
    'memberName',
    'memberId',
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
        const ticketSearch = createScopedTicketQuery(identity, filters).and(searchFilter);
        let results = await ticketSearch
            .fields(...TICKET_FIELDS)
            .limit(SEARCH_PAGE_SIZE)
            .find({ returnTotalCount: false });
        const allItems: SidebarTicket[] = results.items
            .map(mapSidebarTicket)
            .filter((ticket) => isVisibleSidebarTicket(ticket, filters));

        while (results.hasNext()) {
            results = await results.next();
            allItems.push(...results.items
                .map(mapSidebarTicket)
                .filter((ticket) => isVisibleSidebarTicket(ticket, filters)));
        }

        return new Response(JSON.stringify({
            success: true,
            tickets: allItems,
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

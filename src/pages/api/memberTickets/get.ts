import type { APIRoute } from "astro";
import { members } from "@wix/members";
import { checkPermission } from './../auth/checkPermission';
import { captureError } from './../reportError';
import type { MemberTicket } from './types';
import { formatDate, formatStatus, formatTicketNumber } from './helpers';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { CollectionIds } from "@jrapps/my_tickets_common_types";
import type { TicketStatus } from '@jrapps/my_tickets_common_types';
import { getCustomerExpectedResponseBy } from '../utils/slaServer';

const PAGE_SIZE = 10;

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const tokenInfo = await auth.getTokenInfo();
        if (tokenInfo.subjectType !== "MEMBER") {
            return new Response(JSON.stringify({ success: true, error: 'Not logged in' }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }
        const url = new URL(request.url);
        const ticketId = url.searchParams.get('ticketId');
        const page = Number(url.searchParams.get('page') || '1');
        const searchQuery = (url.searchParams.get('search') || '').trim();
        const statusFilter = normalizeStatus(url.searchParams.get('status') || '');
        if (!Number.isSafeInteger(page) || page < 1) {
            status = 400;
            throw new Error('Page must be a positive safe integer');
        }
        if (searchQuery.length > 200) {
            status = 400;
            throw new Error('Search query must be 200 characters or fewer');
        }
        const member = await members.getCurrentMember();
        const memberId = member?.member?._id;
        if (!memberId) {
            status = 400;
            throw new Error('Member ID is required');
        }
        const offset = (page - 1) * PAGE_SIZE;
        const authToken = request.headers.get('Authorization');

        const permitted = await checkPermission(authToken, ["MEMBER"]);
        if (!permitted) {
            status = 403;
            throw new Error('Insufficient Permissions');
        }

        if (ticketId) {
            const ticket = await getTicketById(ticketId);
            return new Response(JSON.stringify({ ticket }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const elevatedQuery = auth.elevate(items.query)(CollectionIds.TICKETS);
        let ticketQuery = elevatedQuery.eq('memberId', memberId);
        if (statusFilter) {
            ticketQuery = ticketQuery.eq('status', statusFilter);
        }
        if (searchQuery && searchQuery !== '#') {
            const numberSearch = searchQuery.replace(/^#/, '');
            const statusSearch = normalizeStatus(searchQuery);
            let searchFilter = items.filter()
                .contains('subject', searchQuery)
                .or(items.filter().contains('status', statusSearch));
            if (numberSearch) {
                searchFilter = searchFilter.or(items.filter().contains('primaryTicketNumber', numberSearch));
            }
            ticketQuery = ticketQuery.and(searchFilter);
        }

        const result = await ticketQuery
            .fields('_id', 'primaryTicketNumber', 'subject', 'status', '_createdDate')
            .descending('primaryTicketNumber')
            .skip(offset)
            .limit(PAGE_SIZE)
            .find({ returnTotalCount: true });
        const totalTickets = result.totalCount ?? result.items.length;
        const tickets: MemberTicket[] = result.items.map((ticket) => ({
            _id: ticket._id,
            ticketId: formatTicketNumber(ticket.primaryTicketNumber),
            primaryTicketNumber: ticket.primaryTicketNumber,
            subject: ticket.subject,
            status: formatStatus(ticket.status as TicketStatus),
            submittedDate: formatDate(ticket._createdDate),
        }));
        const totalPages = Math.ceil(totalTickets / PAGE_SIZE);

        return new Response(JSON.stringify({ success: true, tickets, totalPages, totalTickets }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: error.message, requestId }), {
            status,
            headers: { "Content-Type": "application/json", "x-mytickets-request-id": requestId },
        });
    }
}

function normalizeStatus(value: string): string {
    return value.trim().toLocaleLowerCase().replace(/[\s-]+/g, '_');
}

async function getTicketById(ticketId: string): Promise<MemberTicket> {
    if (!ticketId) {
        throw new Error('ticketId query parameter is required');
    }

    const member = await members.getCurrentMember();
    const memberId = member?.member?._id;
    if (!memberId) {
        throw new Error('Member ID is required');
    }

    const elevatedGetTicket = auth.elevate(items.get);
    const ticket: any = await elevatedGetTicket(CollectionIds.TICKETS, ticketId, {
        fields: ['memberName', 'priority', 'subject', 'description', '_id', '_createdDate', 'status', 'primaryTicketNumber', 'memberId', 'communication', 'sla'],
    });

    if (ticket?.memberId !== memberId) {
        throw new Error('You do not have permission to view this ticket');
    }
    const expectedResponseBy = await getCustomerExpectedResponseBy(ticket).catch(() => null);
    const { sla: _internalSla, ...customerTicket } = ticket;
    return expectedResponseBy ? { ...customerTicket, expectedResponseBy } : customerTicket;
}

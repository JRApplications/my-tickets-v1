import type { APIRoute } from "astro";
import { members } from "@wix/members";
import { checkPermission } from './../auth/checkPermission';
import { generateElevatedAuthToken } from './../auth/generateElevatedAuthToken';
import { captureError } from './../reportError';
import type { MemberTicket, FetchMemberTicketsPageResult, MemberTicketDataItem, CacheEntry } from './types';
import { PAGE_SIZE, CACHE_TTL_MS } from './types';
import { formatDate, formatStatus, formatTicketNumber } from './helpers';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { CollectionIds } from "@jrapps/my_tickets_common_types";
import type { TicketStatus } from '@jrapps/my_tickets_common_types';
import { getCustomerExpectedResponseBy } from '../utils/slaServer';

const ticketCache = new Map<string, CacheEntry>();

function getCached(memberId: string): MemberTicket[] | null {
    const entry = ticketCache.get(memberId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        ticketCache.delete(memberId);
        return null;
    }
    return entry.tickets;
}

function setCache(memberId: string, tickets: MemberTicket[]): void {
    ticketCache.set(memberId, { tickets, expiresAt: Date.now() + CACHE_TTL_MS });
}

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
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const member = await members.getCurrentMember();
        const memberId = member?.member?._id;
        if (!memberId) {
            status = 400;
            throw new Error('Member ID is required');
        }
        const pageSize = 10;
        const offset = (page - 1) * pageSize;
        const authToken = request.headers.get('Authorization');

        // Permission check must happen on every request regardless of cache state.
        const permitted = await checkPermission(authToken, ["MEMBER"]);

        if (!permitted) {
            status = 403;
            throw new Error('Insufficient Permissions');
        }

        if (ticketId) {
            const ticket = await getTicketById(ticketId);
            return new Response(JSON.stringify({ticket}), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }



        // FIX: actually read the cache before hitting Wix again.
        let tickets = getCached(memberId);

        if (!tickets) {
            // Only pay for elevated-token generation when we actually need to fetch.
            const elevatedAuthToken = await generateElevatedAuthToken(authToken);
            tickets = await fetchAllTickets(elevatedAuthToken, memberId);
            setCache(memberId, tickets);
        }

        const paginatedTickets = tickets.slice(offset, offset + pageSize);
        const totalPages = Math.ceil(tickets.length / pageSize);

        return new Response(JSON.stringify({ success: true, tickets: paginatedTickets, totalPages }), {
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

async function getTicketById(ticketId: string): Promise<MemberTicket> {
    
        if (!ticketId) {
            throw new Error('ticketId query parameter is required');
        }
        
        try {
    
            const member = await members.getCurrentMember();
            const memberId = member?.member?._id;
            if (!memberId) {
                throw new Error('Member ID is required');
            }
    
            const elevatedGetTicket = auth.elevate(items.get)
            const ticket: any = await elevatedGetTicket(CollectionIds.TICKETS, ticketId, { fields: ['memberName', 'priority', 'subject', 'description', '_id', '_createdDate', 'status', 'primaryTicketNumber', 'memberId', 'communication', 'sla'] });
    
            if (ticket?.memberId !== memberId) {
                throw new Error('You do not have permission to view this ticket');
            }
            // Internal SLA data is not for customers; only the derived ETA is returned.
            const expectedResponseBy = await getCustomerExpectedResponseBy(ticket).catch(() => null);
            const { sla: _internalSla, ...customerTicket } = ticket;
            return expectedResponseBy ? { ...customerTicket, expectedResponseBy } : customerTicket;
        } catch (error: any) {
            throw error;
        }
}

async function fetchAllTicketPage(
    accessToken: string | null,
    cursor: string | null,
    memberId: string
): Promise<FetchMemberTicketsPageResult> {
    const endpoint = "https://www.wixapis.com/graphql/alpha";

    const query = `
        query GetTeams($dataCollectionId: String!, $filter: JSON, $sort: [CloudDataDataUpstreamCommonSortingInput]) {
            dataItemsV2DataItems(queryInput: {
                dataCollectionId: $dataCollectionId,
                query: {
                    fields: ["primaryTicketNumber", "subject", "priority", "status"],
                    sort: $sort,
                    filter: $filter,
                    cursorPaging: {
                        limit: ${PAGE_SIZE}
                        ${cursor ? `, cursor: "${cursor}"` : ""}
                    }
                }
            }) {
                items {
                    id
                    data
                }
                pageInfo {
                    hasNext
                    nextCursor
                }
            }
        }
    `;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            query,
            variables: {
                dataCollectionId: CollectionIds.TICKETS,
                ...(memberId ? { filter: { "memberId": { $eq: memberId } } } : {}),
                sort: [{ fieldName: "primaryTicketNumber", order: "DESC" }]
            }
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const { items, pageInfo } = result.data.dataItemsV2DataItems;

    const mapped: MemberTicket[] = items.map((item: MemberTicketDataItem) => ({
        _id: item.id,
        ticketId: formatTicketNumber(item.data.primaryTicketNumber),
        subject: item.data.subject,
        status: formatStatus(item.data.status as TicketStatus),
        submittedDate: formatDate(item.data._createdDate)
    }));

    return { items: mapped, pageInfo };
}

async function fetchAllTickets(accessToken: string | null, memberId: string): Promise<MemberTicket[]> {
    const firstPage = await fetchAllTicketPage(accessToken, null, memberId);

    if (!firstPage.pageInfo.hasNext) {
        return firstPage.items;
    }

    const allItems: MemberTicket[] = [...firstPage.items];
    let cursor: string | null = firstPage.pageInfo.nextCursor;

    // Sequential is required here: each cursor depends on the previous response,
    // so this can't be parallelized with Promise.all.
    while (cursor !== null) {
        const { items, pageInfo } = await fetchAllTicketPage(accessToken, cursor, memberId);
        allItems.push(...items);
        cursor = pageInfo.hasNext ? pageInfo.nextCursor : null;
    }

    return allItems;
}
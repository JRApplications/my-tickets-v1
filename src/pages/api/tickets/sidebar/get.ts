import type { APIRoute } from "astro";
import { checkPermission } from '../../auth/checkPermission';
import { generateElevatedAuthToken } from '../../auth/generateElevatedAuthToken';
import { captureError } from '../../reportError';
import { CollectionIds, type Ticket } from '@jrapps/my_tickets_common_types';

interface SidebarTicket extends Ticket {
    _id: string;
    primaryTicketNumber: string;
    subject: string;
    priority: Ticket['priority'];
    status: Ticket['status'];
    assignedAgent?: Ticket['assignedAgent'];
    assignedTeam?: Ticket['assignedTeam'];
    tags?: string[];
}

interface PageInfo {
    hasNext: boolean;
    nextCursor: string | null;
}

interface FetchTeamTicketsPageResult {
    items: SidebarTicket[];
    pageInfo: PageInfo;
}

interface SidebarTicketDataItem {
    id: string;
    data: Pick<SidebarTicket, 'primaryTicketNumber' | 'subject' | 'priority' | 'status' | 'assignedAgent' | 'assignedTeam' | 'tags' | 'isSpam' | 'isDeleted' | 'sla'>;
}

const PAGE_SIZE = 100;
const CACHE_TTL_MS = 30_000;

interface CacheEntry {
    tickets: SidebarTicket[];
    pageInfo: PageInfo;
    expiresAt: number;
}

const ticketCache = new Map<string, CacheEntry>();

function getCached(teamId: string): CacheEntry | null {
    const entry = ticketCache.get(teamId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        ticketCache.delete(teamId);
        return null;
    }
    return entry;
}

function setCache(teamId: string, tickets: SidebarTicket[], pageInfo: PageInfo): void {
    ticketCache.set(teamId, { tickets, pageInfo, expiresAt: Date.now() + CACHE_TTL_MS });
}

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const teamId = url.searchParams.get('teamId');
        const cursor = url.searchParams.get('cursor');
        const authToken = request.headers.get('Authorization');

        if (!teamId) {
            status = 400;
            throw new Error('Team ID is required');
        }

        const [permitted, elevatedAuthToken] = await Promise.all([
            checkPermission(authToken, ["ADMIN", "USER"]),
            generateElevatedAuthToken(authToken),
        ]);

        if (!permitted) {
            status = 403;
            throw new Error('Insufficient Permissions');
        }

        const cached = !cursor ? getCached(teamId) : null;
        if (cached) {
            return new Response(JSON.stringify({
                success: true,
                tickets: cached.tickets,
                hasMore: cached.pageInfo.hasNext,
                nextCursor: cached.pageInfo.nextCursor,
                fromCache: true,
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const result = await fetchTeamTicketPage(elevatedAuthToken, cursor, teamId);
        const tickets = result.items;

        if (!cursor) setCache(teamId, tickets, result.pageInfo);

        return new Response(JSON.stringify({
            success: true,
            tickets,
            hasMore: result.pageInfo.hasNext,
            nextCursor: result.pageInfo.nextCursor,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to fetch tickets' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

async function fetchTeamTicketPage(
    accessToken: string | null,
    cursor: string | null,
    teamId: string
): Promise<FetchTeamTicketsPageResult> {
    const endpoint = "https://www.wixapis.com/graphql/alpha";

    const query = `
        query GetTeams($filter: JSON, $sort: [CloudDataDataUpstreamCommonSortingInput], $dataCollectionId: String, $cursor: String) {
            dataItemsV2DataItems(queryInput: {
                dataCollectionId: $dataCollectionId,
                query: {
                    fields: ["primaryTicketNumber", "subject", "priority", "status", "assignedAgent", "assignedTeam", "tags", "isSpam", "isDeleted", "sla"],
                    sort: $sort,
                    filter: $filter,
                    cursorPaging: {
                        limit: ${PAGE_SIZE}
                        cursor: $cursor
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
                // ...(teamId === "system_admin" ? {} : { filter: { teamId: { $eq: teamId } } }),
                ...(teamId === "system_admin" ? {} : {}),
                sort: [{ fieldName: "primaryTicketNumber", order: "DESC" }],
                dataCollectionId: CollectionIds.TICKETS,
                cursor,
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

    const mapped: SidebarTicket[] = items.map((item: SidebarTicketDataItem) => ({
        _id: item.id,
        primaryTicketId: item.data.primaryTicketNumber,
        subject: item.data.subject,
        priority: item.data.priority,
        status: item.data.status,
        assignedAgent: item.data.assignedAgent,
        assignedTeam: item.data.assignedTeam,
        tags: item.data.tags || [],
        isSpam: item.data.isSpam === true,
        isDeleted: item.data.isDeleted === true,
        sla: item.data.sla,
    }));

    return { items: mapped, pageInfo };
}

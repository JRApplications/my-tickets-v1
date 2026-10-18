import type { APIRoute } from "astro";
import { captureError } from '../reportError';
import { CollectionIds, type Ticket } from '@jrapps/my_tickets_common_types';
import { generateElevatedAuthToken } from '../auth/generateElevatedAuthToken';
import { fetchTicketItemsPage, mapGraphQLDataItem } from './graphql';

interface SidebarTicket extends Ticket {
    _id: string;
    primaryTicketNumber: string;
    subject: string;
    priority: Ticket['priority'];
    status: Ticket['status'];
}

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const query = url.searchParams.get('query');
        if (!query) {
            status = 400;
            throw new Error('Query parameter is required');
        }

        const accessToken = await generateElevatedAuthToken(request.headers.get('Authorization'));
        const allItems: SidebarTicket[] = [];
        let cursor: string | null = null;
        let hasNext = true;
        while (hasNext) {
            const page = await fetchTicketItemsPage({
                accessToken,
                dataCollectionId: CollectionIds.TICKETS,
                fields: ['primaryTicketNumber', 'subject', 'priority', 'status'],
                filter: {
                    $or: [
                        { primaryTicketNumber: query },
                        { memberName: { $contains: query } },
                        { subject: { $contains: query } },
                    ],
                },
                sort: [{ fieldName: 'primaryTicketNumber', order: 'DESC' }],
                limit: 1000,
                cursor,
            });
            allItems.push(...page.items.map((item) => mapGraphQLDataItem<SidebarTicket>(item)));
            hasNext = page.pageInfo.hasNext && !!page.pageInfo.nextCursor;
            cursor = page.pageInfo.nextCursor;
        }
        return new Response(JSON.stringify({
            success: true,
            tickets: allItems.map((item) => ({
                _id: item._id,
                primaryTicketNumber: item.primaryTicketNumber,
                subject: item.subject,
                priority: item.priority,
                status: item.status
            })) as SidebarTicket[]
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error getting ticket' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

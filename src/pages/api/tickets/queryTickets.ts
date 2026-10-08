import type { APIRoute } from "astro";
import { items } from '@wix/data';
import { captureError } from '../reportError';
import { CollectionIds, type Ticket } from '@jrapps/my_tickets_common_types';

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

        let allItems: SidebarTicket[] = [];
        let results = await items.query(CollectionIds.TICKETS)
            .eq('primaryTicketNumber', query)
            .or(items.filter().contains("memberName", query))
            .or(items.filter().contains("subject", query))
            .fields('_id', 'primaryTicketNumber', 'subject', 'priority', 'status')
            .limit(1000)
            .descending('primaryTicketNumber')
            .find({ returnTotalCount: false });

        allItems = allItems.concat(results.items as unknown as SidebarTicket[]);

        while (results.hasNext()) {
            results = await results.next();
            allItems = allItems.concat(results.items as unknown as SidebarTicket[]);
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
import type { APIRoute } from "astro";
import { items } from '@wix/data';
import { captureError } from '../reportError';
import { CollectionIds, type Ticket } from '@jrapps/my_tickets_common_types';

interface RelatedTicket extends Ticket {
    _id: string;
    primaryTicketNumber: string;
    subject: string;
    _UpdatedDate: string;
    tags: string[];
}

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const { tags } = await request.json();

        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            status = 400;
            throw new Error('Tags are required');
        }

        let allItems: RelatedTicket[] = [];
        let results = await items.query(CollectionIds.TICKETS)
            .hasSome("tags", tags)
            .fields('_id', 'primaryTicketNumber', 'subject', '_UpdatedDate', 'tags')
            .limit(1000)
            .descending('primaryTicketNumber')
            .find({ returnTotalCount: false });

        allItems = allItems.concat(results.items as unknown as RelatedTicket[]);

        while (results.hasNext()) {
            results = await results.next();
            allItems = allItems.concat(results.items as unknown as RelatedTicket[]);
        }
        return new Response(JSON.stringify({
            success: true,
            tickets: allItems.map((item) => ({
                _id: item._id,
                primaryTicketNumber: item.primaryTicketNumber,
                subject: item.subject,
                _UpdatedDate: item._UpdatedDate,
                tags: item.tags,
            })) as RelatedTicket[]
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
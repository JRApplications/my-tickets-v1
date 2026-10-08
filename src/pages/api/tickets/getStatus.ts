import type { APIRoute} from "astro";
import { items } from "@wix/data";
import { auth } from '@wix/essentials';
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) {
            status = 400;
            throw new Error('Ticket ID is required');
        }
        const elevatedGet = auth.elevate(items.get)
        const itemResponse = await elevatedGet(CollectionIds.TICKETS, id, {fields: ["status", "primaryTicketNumber"]});

        if (!itemResponse) {
            status = 404;
            throw new Error('Ticket not found');
        }

        return new Response(JSON.stringify({ success: true, status: itemResponse?.status, ticketNumber: itemResponse?.primaryTicketNumber}), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to fetch ticket status' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};
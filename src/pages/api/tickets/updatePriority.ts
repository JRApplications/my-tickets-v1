import type { TicketPriority } from '@jrapps/my_tickets_common_types';
import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { captureError } from '../reportError';
import { CollectionIds, TimelineMessageType, formatPriority } from '@jrapps/my_tickets_common_types';
import { auth as elevatedAuth } from '@wix/essentials';
import { recomputeTicketSla, runSlaHook } from '../utils/slaServer';

export const PUT: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const newPriority = url.searchParams.get('priority');
        const baseUrl = url.origin;
        const auth = request.headers.get('Authorization');

        if (!id) {
            status = 400;
            throw new Error('Ticket ID is required');
        }
        if (!newPriority) {
            status = 400;
            throw new Error('Priority is required');
        }

        const elevatedBulkPatch = elevatedAuth.elevate(items.bulkPatch)
        const result = await elevatedBulkPatch(CollectionIds.TICKETS, [id]).setField("priority", newPriority).run();
        if (!result) {
            status = 500;
            throw new Error('Failed to update ticket priority');
        }
        if (result.errors && result.errors.length > 0) {
            console.error('Errors during bulkPatch:', result.errors);
            status = 500;
            throw new Error(`Failed to update ticket priority due to errors. Code ${result.errors[0].code}`);
        }
        await addTicketTimeline(id, newPriority, baseUrl, auth, request.headers.get('x-my-tickets-auth') || '');
        await runSlaHook(() => recomputeTicketSla(id));
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error updating ticket priority' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

const addTicketTimeline = async (ticketId: string, newPriority: string, baseUrl: string, auth: any, agentAuthToken: string) => {
    try {
        const formattedPriority = formatPriority(newPriority as TicketPriority);
        const response = await fetch(`${baseUrl}/api/tickets/timeline/addTimeline`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth,
                'x-my-tickets-auth': agentAuthToken,
            },
            body: JSON.stringify({ ticketId, message: `Ticket priority updated to ${formattedPriority}`, type: TimelineMessageType.TICKET_PRIORITY_CHANGED })
        });
        if (!response.ok) {
            throw new Error('Failed to add ticket timeline');
        }
    } catch (error) {
        console.error('Error adding ticket priority timeline:', error);
    }
};

import type { APIRoute } from "astro";
import type { TicketStatus } from '@jrapps/my_tickets_common_types';
import { items } from "@wix/data";
import { captureError } from '../reportError';
import { CollectionIds, TimelineMessageType, formatStatus } from '@jrapps/my_tickets_common_types';
import { auth as elevatedAuth } from '@wix/essentials';
import { markSlaReopened, markSlaResolved, runSlaHook } from '../utils/slaServer';

export const PUT: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const newStatus = url.searchParams.get('status');
        const baseUrl = url.origin;
        const auth = request.headers.get('Authorization');

        if (!id) {
            status = 400;
            throw new Error('Ticket ID is required');
        }
        if (!newStatus) {
            status = 400;
            throw new Error('Status is required');
        }

        const elevatedBulkPatch = elevatedAuth.elevate(items.bulkPatch);
        const result = await elevatedBulkPatch(CollectionIds.TICKETS, [id]).setField("status", newStatus).run();
        if (!result) {
            status = 500;
            throw new Error('Failed to update ticket status');
        }
        if (result.errors && result.errors.length > 0) {
            console.error('Errors during bulkPatch:', result.errors);
            status = 500;
            throw new Error(`Failed to update ticket status due to errors. Code ${result.errors[0].code}`);
        }
        await addTicketTimeline(id, newStatus, baseUrl, auth, request.headers.get('x-my-tickets-auth') || '');
        await runSlaHook(() => ['resolved', 'closed'].includes(newStatus) ? markSlaResolved(id) : markSlaReopened(id));
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error updating ticket status' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

const addTicketTimeline = async (ticketId: string, newStatus: string, baseUrl: string, auth: any, agentAuthToken: string) => {

    try {
        const formattedStatus = formatStatus(newStatus as TicketStatus);
        const response = await fetch(`${baseUrl}/api/tickets/timeline/addTimeline`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth,
                'x-my-tickets-auth': agentAuthToken,
            },
            body: JSON.stringify({ ticketId, message: `Ticket status updated to ${formattedStatus}`, type: TimelineMessageType.TICKET_STATUS_CHANGED })
        });
        if (!response.ok) {
            throw new Error('Failed to add ticket timeline');
        }
    } catch (error) {
        console.error('Error adding ticket status timeline:', error);
    }
};

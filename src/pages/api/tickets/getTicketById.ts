import type { APIRoute } from "astro";
import { items } from '@wix/data';
import { captureError } from '../reportError';
import { type Ticket, type MergeSummaryObject, CollectionIds } from '@jrapps/my_tickets_common_types';

import { SYSTEM_ADMIN_NAME, isSystemAdmin } from '../auth/system-admin';

const getTicketPrimaryTicketNumberById = async (ticketId: string): Promise<string> => {
    try {
        const ticket = await items.get(CollectionIds.TICKETS, ticketId);
        return ticket?.primaryTicketNumber;
    } catch (error) {
        throw new Error(`Error fetching ticket primary ticket number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

const getAssigneeNameById = async (assignee: string): Promise<string> => {
    try {
        if (isSystemAdmin(assignee)) return SYSTEM_ADMIN_NAME;
        const user = await items.get(CollectionIds.AGENTS, assignee);
        return user?.name || '';
    } catch (error) {
        throw new Error(`Error fetching assignee name for assigneeId ${assignee}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (id) {
            const ticketResponse = await items.get(CollectionIds.TICKETS, id, { consistentRead: true, });
            if (!ticketResponse) {
                status = 404;
                throw new Error(`Ticket with ID ${id} not found`);
            }

            if (ticketResponse.mergeSummary) {
                ticketResponse.mergeSummary = await formatMergeSummary(ticketResponse.mergeSummary);
            }

            if (ticketResponse.relatedTickets) {
                ticketResponse.relatedTickets = await Promise.all(ticketResponse.relatedTickets.map(getTicketPrimaryTicketNumberById));
            }
            return new Response(JSON.stringify({ success: true, ticket: ticketResponse as Ticket }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }
        status = 400;
        throw new Error('Ticket query or ID is required');
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

const formatMergeSummary = async (mergeSummary: MergeSummaryObject) => {
    // convert Id's into ticket numbers or team names if needed
    return {
        mergedIntoTicketId: await getTicketPrimaryTicketNumberById(mergeSummary.mergedIntoTicketId),
        originalTicketIds: await Promise.all(mergeSummary.originalTicketIds.map(getTicketPrimaryTicketNumberById)),
        mergedAt: mergeSummary.mergedAt,
        mergedBy: await getAssigneeNameById(mergeSummary.mergedBy),
        reason: mergeSummary.reason,
    };
};

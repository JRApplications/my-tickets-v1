import type { APIRoute } from "astro";
import { items } from '@wix/data';
import { captureError } from '../reportError';
import { type Ticket, type MergeSummaryObject, CollectionIds } from '@jrapps/my_tickets_common_types';

import { SYSTEM_ADMIN_NAME, isSystemAdmin } from '../auth/system-admin';
import { findScopedTicketById, findScopedTicketNumberById } from './sidebar/query';

const getTicketPrimaryTicketNumberById = async (identity: NonNullable<App.Locals['myTicketsIdentity']>, ticketId: string): Promise<string> => {
    try {
        return await findScopedTicketNumberById(identity, ticketId);
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
        const identity = locals.myTicketsIdentity;
        if (!identity) {
            status = 401;
            throw new Error('My Tickets agent authentication is required');
        }
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (id) {
            const ticketResponse = await findScopedTicketById(identity, id);
            if (!ticketResponse) {
                status = 404;
                throw new Error(`Ticket with ID ${id} not found or is outside your team scope`);
            }

            if (ticketResponse.mergeSummary) {
                ticketResponse.mergeSummary = await formatMergeSummary(identity, ticketResponse.mergeSummary);
            }

            if (ticketResponse.relatedTickets) {
                ticketResponse.relatedTickets = await Promise.all(ticketResponse.relatedTickets.map((relatedId) =>
                    getTicketPrimaryTicketNumberById(identity, relatedId),
                ));
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

const formatMergeSummary = async (
    identity: NonNullable<App.Locals['myTicketsIdentity']>,
    mergeSummary: MergeSummaryObject,
) => {
    // convert Id's into ticket numbers or team names if needed
    return {
        mergedIntoTicketId: await getTicketPrimaryTicketNumberById(identity, mergeSummary.mergedIntoTicketId),
        originalTicketIds: await Promise.all(mergeSummary.originalTicketIds.map((ticketId) =>
            getTicketPrimaryTicketNumberById(identity, ticketId),
        )),
        mergedAt: mergeSummary.mergedAt,
        mergedBy: await getAssigneeNameById(mergeSummary.mergedBy),
        reason: mergeSummary.reason,
    };
};

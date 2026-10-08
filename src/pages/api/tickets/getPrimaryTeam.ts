import type { APIRoute } from "astro";
import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { captureError } from '../reportError';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const ticketId = url.searchParams.get('id');
        if (!ticketId) {
            status = 400;
            throw new Error('Ticket ID is required');
        }

        const response = await items.get(CollectionIds.TICKETS, String(ticketId));
        const teamId = response?.assignedTeam.id;
        const primaryTicketNumber = response?.primaryTicketNumber;
        
        if (!teamId) {
            status = 404;
            throw new Error('No team associated with this ticket');
        }
        
        const response1 = await items.get(CollectionIds.TEAMS, String(teamId));
        const teamName = response1?.name;

        if (!teamName) {
            status = 404;
            throw new Error('Team not found');
        }

        return new Response(JSON.stringify({ success: true, team: { _id: teamId, name: teamName, ticketNumber: primaryTicketNumber } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to fetch team information' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};
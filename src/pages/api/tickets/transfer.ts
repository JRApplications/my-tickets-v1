import type { APIRoute } from "astro";
import { items as wixData } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { captureError } from '../reportError';
import { recomputeTicketSla, runSlaHook } from '../utils/slaServer';
import { auth } from '@wix/essentials';

export const PUT: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const ticketId = url.searchParams.get('id');
        const teamId = url.searchParams.get('teamId');
        if (!ticketId || !teamId) {
            status = 400;
            throw new Error('Ticket ID and Team ID are required');
        }

        const elevatedGet = auth.elevate(wixData.get)

        const ticketResponse = await elevatedGet(CollectionIds.TICKETS, String(ticketId));
        const currentTeamId = ticketResponse?.assignedTeam;
        if (!currentTeamId) {
            status = 404;
            throw new Error('Ticket not found or has no team associated');
        }

        const newTeamObject = {
            "id": String(teamId),
            "name": await getTeamName(String(teamId)) // You can replace this with the actual team name if available
        }

        const response = await wixData.bulkPatch(CollectionIds.TICKETS, [String(ticketId)]).setField('assignedTeam', newTeamObject).run();
        if (!response) {
            status = 500;
            throw new Error('Failed to transfer ticket');
        }
        if (response.errors && response.errors.length > 0) {
            status = 500;
            throw new Error(`Failed to transfer ticket`);
        }
        await runSlaHook(() => recomputeTicketSla(String(ticketId)));
        return new Response(JSON.stringify({ success: true, teamId: teamId }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error transferring ticket' }), {
            status: status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

const getTeamName = async (teamId: string) => {
    try {
        const elevatedGet = auth.elevate(wixData.get);
        const teamResponse = await elevatedGet(CollectionIds.TEAMS, String(teamId));
        return teamResponse?.name || "";
    } catch (error: any) {
        console.error(`Failed to get team name for teamId ${teamId}:`, error.message);
        return "";
    }
};
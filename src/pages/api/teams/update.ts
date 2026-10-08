import type { APIRoute } from "astro";
import { items } from "@wix/data"; 
import { captureError } from '../reportError';
import { CollectionIds, type Team } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';

export const PUT: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) { status = 403; throw new Error('Insufficient permissions'); }
        const url = new URL(request.url);
        const teamId = url.searchParams.get("id");
        if (!teamId) {
            status = 400;
            throw new Error("Team ID is required");
        }

        const data = await request.json() as Team;

        if (!data._id) {
            status = 400;
            throw new Error("Team ID is required in body");
        }

        let updatedTeam = {
            _id: data._id,
            name: data.name || undefined,
            description: data.description || undefined,
            email: data.email ? `${data.email.replace(/@mytickets\.internal$/i, '')}@mytickets.internal` : undefined,
            teamPictureUrl: data.teamPictureUrl || undefined
        }

        const result = await items.update(CollectionIds.TEAMS, updatedTeam);

        if (!result) {
            status = 404;
            throw new Error('Team not found');
        }

        return new Response(JSON.stringify({ success: true, team: result }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to update team' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

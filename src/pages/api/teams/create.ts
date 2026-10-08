import type { APIRoute } from "astro";
import { items } from "@wix/data"; 
import { captureError } from '../reportError';
import { CollectionIds, type Team } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) { status = 403; throw new Error('Insufficient permissions'); }
        const data = await request.json() as Team;
        if (!data) {
            status = 400;
            throw new Error('No team data provided');
        }

        if (!data.name) {
            status = 400;
            throw new Error('Team name is required');
        }

        let newTeam = {
            name: data.name || undefined,
            description: data.description || undefined,
            email: data.email ? `${data.email.replace(/@mytickets\.internal$/i, '')}@mytickets.internal` : `${data?.name.replace(/\s+/g, '').toLowerCase()}@mytickets.internal`,
            teamPictureUrl: data.teamPictureUrl || undefined,
        }
        const createdTeam = await items.insert(CollectionIds.TEAMS, newTeam as Team);
        const result = { success: true, team: createdTeam };
        return new Response(JSON.stringify(result), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to create team' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

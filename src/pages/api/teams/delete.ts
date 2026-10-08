import type { APIRoute } from "astro";
import { items } from "@wix/data"; 
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';

export const DELETE: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) { status = 403; throw new Error('Insufficient permissions'); }
        const url = new URL(request.url);
        const teamId = url.searchParams.get("id");
        if (!teamId) {
            status = 400;
            throw new Error("Team ID is required");
        }
        const result = await items.remove(CollectionIds.TEAMS, teamId);
        if (!result) {
            status = 404;
            throw new Error("Team not found");
        }
        return new Response(null, { status: 204 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to delete team' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

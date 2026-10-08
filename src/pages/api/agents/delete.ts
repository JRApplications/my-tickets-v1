import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';

export const DELETE: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        const url = new URL(request.url);
        const userId = url.searchParams.get("id");
        if (!userId) {
            status = 400;
            throw new Error("User ID is required");
        }
        const result = await items.remove(CollectionIds.AGENTS, userId);
        if (!result) {
            status = 404;
            throw new Error(`User not found: ${userId}`);
        }
        return new Response(null, { status: 204 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error deleting user' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

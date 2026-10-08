import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { captureError } from '../reportError';
import { CollectionIds } from "@jrapps/my_tickets_common_types";
import { checkPermission } from '../auth/checkPermission';

export const DELETE: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) { status = 403; throw new Error('Insufficient permissions'); }
        const url = new URL(request.url);
        const roleId = url.searchParams.get("id");

        if (!roleId) {
            status = 400;
            throw new Error("Role ID is required for deletion.");
        }

        await items.remove(CollectionIds.ROLES, roleId);

        return new Response(JSON.stringify({ success: true, message: "Role deleted successfully." }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error deleting role' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

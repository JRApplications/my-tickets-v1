import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { captureError } from '../reportError';
import { CollectionIds, type Role } from "@jrapps/my_tickets_common_types";
import { checkPermission } from '../auth/checkPermission';
import { auth } from "@wix/essentials";

export const PUT: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) { status = 403; throw new Error('Insufficient permissions'); }
        const body = await request.json();
        const { _id: id, roleName, roleDescription, permissions }: Role = body;

        if (!id || !roleName || !roleDescription || !permissions) {
            status = 400;
            throw new Error("Missing required fields: _id, roleName, roleDescription, and permissions are required.");
        }

        const elevatedUpdate = auth.elevate(items.update)
        const updatedRole = await elevatedUpdate(CollectionIds.ROLES, {
            "_id": id,
            roleName,
            roleDescription,
            permissions
        });

        if (!updatedRole) {
            status = 404;
            throw new Error("Role not found");
        }

        const role = updatedRole;
        const mappedUpdatedRole = {
            id: role._id,
            roleName: role.roleName,
            roleDescription: role.roleDescription,
            created: role._createdDate?.toISOString().split('T')[0],
            lastUpdated: role._updatedDate?.toISOString().split('T')[0]
        };

        return new Response(JSON.stringify({ success: true, role: mappedUpdatedRole }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error updating role' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

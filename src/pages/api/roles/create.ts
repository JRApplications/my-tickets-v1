import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { auth } from "@wix/essentials";
import { captureError } from '../reportError';
import { CollectionIds, type Role } from "@jrapps/my_tickets_common_types";
import { checkPermission } from '../auth/checkPermission';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) { status = 403; throw new Error('Insufficient permissions'); }
        const body = await request.json();
        const { roleName, roleDescription, permissions }: Role = body;

        if (!roleName || !roleDescription || !permissions) {
            status = 400;
            throw new Error("Missing required fields: roleName, roleDescription, and permissions are required.");
        }

        const elevatedInsert = auth.elevate(items.insert);
        const role = await elevatedInsert(CollectionIds.ROLES, {
            roleName,
            roleDescription,
            permissions
        });

        const newRole = {
            id: role._id,
            _id: role._id,
            roleName: role.roleName,
            roleDescription: role.roleDescription,
            permissions: role.permissions,
            created: role._createdDate?.toISOString().split('T')[0],
            lastUpdated: role._updatedDate?.toISOString().split('T')[0],
        };

        return new Response(JSON.stringify({ success: true, role: newRole }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error creating role' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

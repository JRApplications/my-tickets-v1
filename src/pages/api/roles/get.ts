import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { captureError } from '../reportError';
import { auth } from '@wix/essentials';
import { CollectionIds } from "@jrapps/my_tickets_common_types";

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const roleId = url.searchParams.get("id");

        if (roleId) {
            const role = await items.get(CollectionIds.ROLES, roleId);
            if (!role) {
                status = 404;
                throw new Error("Role not found");
            }

            if (role.roleName === 'DEFAULT_ADMIN') {
                status = 403;
                throw new Error("Access to this role is restricted");
            }

            const mappedRole = {
                id: role._id,
                _id: role._id,
                roleName: role.roleName,
                roleDescription: role.roleDescription,
                permissions: role.permissions,
                created: role._createdDate?.toISOString().split('T')[0],
                lastUpdated: role._updatedDate?.toISOString().split('T')[0],
            };

            return new Response(JSON.stringify({ success: true, role: mappedRole }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }
        const elevatedQuery = auth.elevate(items.query);
        const roles = await elevatedQuery(CollectionIds.ROLES).fields('roleName', 'roleDescription', '_createdDate', '_updatedDate').find();
        const formattedRoles = roles.items.map(role => ({
                _id: role._id,
                id: role._id,
                roleName: role.roleName,
                roleDescription: role.roleDescription,
                created: role?._createdDate?.toISOString().split('T')[0],
                lastUpdated: role?._updatedDate?.toISOString().split('T')[0]
            }))
            // .filter(role => role.roleName !== 'DEFAULT_ADMIN');
        
        return new Response(JSON.stringify({
            "success": true,
            "roles": formattedRoles
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error fetching role' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};
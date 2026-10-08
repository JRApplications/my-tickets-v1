import type { APIRoute } from 'astro';
import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { captureError } from '../reportError';
import { CollectionIds } from "@jrapps/my_tickets_common_types";

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            status = 400;
            throw new Error('Role ID is required for duplication.');
        }

        // Fetch the existing role
        const elevatedGet = auth.elevate(items.get);
        const existingRole = await elevatedGet(CollectionIds.ROLES, id);
        if (!existingRole) {
            status = 404;
            throw new Error('Role not found.');
        }

        // Create a new role object by duplicating the existing one
        const newRole = {
            ...existingRole,
            _id: undefined, // Ensure a new ID is generated
            roleName: `${existingRole.roleName} (Copy)`, // Optionally modify the name to indicate it's a copy
        };

        // Save the new role
        const elevatedInsert = auth.elevate(items.insert);
        const createdRole: any = await elevatedInsert(CollectionIds.ROLES, newRole);
        if (!createdRole) {
            throw new Error('Failed to create duplicated role.');
        }

        const mappedRoleToReturn: { id: string; roleName: string; created: string; lastUpdated: string } = {
            "id": createdRole._id,
            "roleName": createdRole.roleName,
            "created": createdRole?._createdDate?.toISOString().split('T')[0],
            "lastUpdated": createdRole?._updatedDate?.toISOString().split('T')[0],
        };


        return new Response(JSON.stringify({ success: true, role: mappedRoleToReturn }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error duplicating role' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

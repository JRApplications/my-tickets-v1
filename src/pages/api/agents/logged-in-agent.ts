import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { ADMIN_PERMISSIONS } from '../auth/admin-permissions';
import { SYSTEM_ADMIN_ID, SYSTEM_ADMIN_NAME, isSystemAdmin } from '../auth/system-admin';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const identity = locals.myTicketsIdentity;
        const userId = identity?.agentId;
        if (!identity) {
            status = 401;
            throw new Error('Authenticated agent identity is required');
        }

        if (isSystemAdmin(userId)) {
            return new Response(JSON.stringify({ success: true, user: {
                _id: SYSTEM_ADMIN_ID, name: SYSTEM_ADMIN_NAME, role: "System Admin", roleName: "System Admin",
                roleId: identity.roleId, team: null, teamId: identity.teamId, teamName: '',
                profilePictureUrl: null, agentProfilePictureUrl: '', permissions: ADMIN_PERMISSIONS, isAdmin: true, isSystemAdmin: true,
            } }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (userId) {
            const user = await items.get(CollectionIds.AGENTS, userId, {
                includeReferences: [{ field: 'role', limit: 1 }, { field: 'team', limit: 1 }],
            });
            if (!user) {
                status = 404;
                throw new Error("User not found");
            }
            const userToReturn = {
                _id: user._id,
                name: user.name,
                role: (user.role?.roleName ?? ' ').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: any) => c.toUpperCase()),
                roleName: user.role?.roleName ?? '',
                roleId: user.role?._id ?? identity.roleId,
                permissions: user.role?.permissions ?? [],
                team: user.team?._id ?? user.team,
                teamId: user.team?._id ?? identity.teamId,
                teamName: user.team?.name ?? '',
                profilePictureUrl: user.profilePictureUrl,
                agentProfilePictureUrl: user.profilePictureUrl ?? '',
                isAdmin: user.isAdmin,
            }
            return new Response(JSON.stringify({ success: true, user: userToReturn }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        status = 400;
        throw new Error("User ID is required");
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error fetching user' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

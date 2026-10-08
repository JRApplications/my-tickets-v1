import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { verifyPassword } from "./password-utils";
import { captureError } from '../reportError';
import { CollectionIds, type Agent } from "@jrapps/my_tickets_common_types";
import { issueToken } from '../my-tickets-auth/token';
import { ADMIN_PERMISSIONS } from './admin-permissions';
import { SYSTEM_ADMIN_EMAIL, SYSTEM_ADMIN_ID } from './system-admin';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const { email, userId } = await request.json();
        if (!email || !userId) {
            throw new Error("Missing email or User ID in request body");
        }

        if (email === SYSTEM_ADMIN_EMAIL && userId === "admin") {
            const { token, expiresAt } = await issueToken({ agentId: SYSTEM_ADMIN_ID, teamId: SYSTEM_ADMIN_ID, roleId: SYSTEM_ADMIN_ID });
            return new Response(JSON.stringify({
                success: true,
                teamId: SYSTEM_ADMIN_ID,
                agentId: SYSTEM_ADMIN_ID,
                permissions: ADMIN_PERMISSIONS,
                isSystemAdmin: true,
                authToken: token,
                authTokenExpiresAt: expiresAt,
                name: 'System',
                roleId: SYSTEM_ADMIN_ID,
                roleName: 'System Admin',
                teamName: '',
                agentProfilePictureUrl: '',
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        let allItems: Agent[] = [];
        let results = await items.query(CollectionIds.AGENTS)
            .eq('email', email)
            .include('team', 'role')
            // .fields('_id', 'email', 'userId', 'team._id', 'role.permissions')
            .find()

        allItems = allItems.concat(results.items as Agent[]);

        while (results.hasNext()) {
            results = await results.next();
            allItems = allItems.concat(results.items as Agent[]);
        }

        if (allItems && allItems.length > 0) {
            const user = allItems[0] as Agent;
            if (!user.userId || (!user.userId.includes(':') && !user.userId.startsWith('$2'))) {
                status = 400;
                throw new Error("Account required password reset.");
            }

            const isValid = await verifyPassword(userId, user.userId);
            if (!isValid) {
                status = 401;
                throw new Error("Invalid email or User ID");
            }

            if (!user?.team?._id) {
                status = 404;
                throw new Error("Team ID not found for the user");
            }

            const item = await items.get(CollectionIds.TEAMS, user?.team?._id);

            if (!item) {
                status = 404;
                throw new Error("Team not found for the user");
            }
            const { token, expiresAt } = await issueToken({
                agentId: user._id!,
                teamId: user.team._id,
                roleId: user.role._id!,
            });

            return new Response(JSON.stringify({
                success: true,
                teamId: user.team._id,
                agentId: user._id,
                permissions: user.role.permissions,
                authToken: token,
                authTokenExpiresAt: expiresAt,
                name: user.name,
                roleId: user.role._id,
                roleName: user.role.roleName,
                teamName: user.team.name,
                agentProfilePictureUrl: user.profilePictureUrl ?? '',
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ success: false, message: "Invalid email or User ID" }), {
            status: 401,
            statusText: "Unauthorized",
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error logging in' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

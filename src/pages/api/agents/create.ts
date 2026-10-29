import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { generateSalt, hashPassword } from "../auth/password-utils";
import { captureError } from '../reportError';
import { CollectionIds, type Agent } from '@jrapps/my_tickets_common_types';
import { auth } from '@wix/essentials';
import { checkPermission } from '../auth/checkPermission';
import { getPlanLimitStatus } from '../utils/plan-limits';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) { status = 403; throw new Error('Insufficient permissions'); }
        const data = await request.json() as Agent;
        const salt = await generateSalt();
        const hashedUserId = data.userId ? await hashPassword(data.userId, salt) : undefined;
        let newUser = {
            userId: hashedUserId || undefined,
            email: data.email ? `${data.email.replace(/@mytickets\.internal$/i, '')}@mytickets.internal` : undefined,
            name: data.name || undefined,
            phoneNumber: data.phoneNumber || undefined,
            team: data.team || undefined, // team uuid
            role: data.role || undefined, // role uuid
            profilePictureUrl: data.profilePictureUrl || undefined,
            assignedTickets: undefined, // always undefined on creation
            isAdmin: undefined, // always undefined
        }
        status = 503;
        const agentLimit = await getPlanLimitStatus('agents', locals.myTicketsIdentity?.agentId);
        if (agentLimit.reached) {
            status = 409;
            return new Response(JSON.stringify({ success: false, limitReached: true, error: `Agent limit reached (${agentLimit.count}/${agentLimit.limit}). Upgrade your plan to add more agents.` }), {
                status, headers: { 'Content-Type': 'application/json' },
            });
        }
        status = 500;
        const elevatedInsert = auth.elevate(items.insert);
        const createdUser = await elevatedInsert(CollectionIds.AGENTS, newUser as Agent);
        // Explicit whitelist: never return the password hash (stored in `userId`) or internal fields.
        const { _id, email, name, phoneNumber, team, role, profilePictureUrl } = createdUser as Agent & { _id: string };
        const result = { success: true, user: { _id, email, name, phoneNumber, team, role, profilePictureUrl } };
        return new Response(JSON.stringify(result), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error creating user' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

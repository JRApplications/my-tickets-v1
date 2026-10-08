import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { generateSalt, hashPassword } from "../auth/password-utils";
import { captureError } from '../reportError';
import { CollectionIds, type Agent } from '@jrapps/my_tickets_common_types';
import { auth } from '@wix/essentials';
import { checkPermission } from '../auth/checkPermission';

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
        const elevatedInsert = auth.elevate(items.insert);
        const createdUser = await elevatedInsert(CollectionIds.AGENTS, newUser as Agent);
        const result = { success: true, user: createdUser };
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

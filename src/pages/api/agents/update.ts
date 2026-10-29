import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { generateSalt, hashPassword } from "../auth/password-utils";
import { captureError } from '../reportError';
import { CollectionIds, type Agent } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';
import { auth } from '@wix/essentials';

export const PUT: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) { status = 403; throw new Error('Insufficient permissions'); }
        const url = new URL(request.url);
        const userId = url.searchParams.get("id");
        if (!userId) {
            status = 400;
            throw new Error("User ID is required");
        }

        const data: any = await request.json();

        if (!data) {
            status = 400;
            throw new Error("Request body is required");
        }

        if (!data._id) {
            status = 400;
            throw new Error("User ID is required in the request body");
        }

        // Wix Data `items.update` replaces the whole item (omitted fields are lost, including the
        // password hash in `userId`), so only the supplied fields are changed with `items.patch`.
        const fields: Record<string, unknown> = {};
        if (data.name) fields.name = data.name;
        if (data.email) fields.email = `${data.email.replace(/@mytickets\.internal$/i, '')}@mytickets.internal`;
        if (data.role) fields.role = data.role;
        if (data.team) fields.team = data.team;
        // Phone and picture may be cleared by sending an empty string.
        if (typeof data.phoneNumber === 'string') fields.phoneNumber = data.phoneNumber;
        if (typeof data.profilePictureUrl === 'string') fields.profilePictureUrl = data.profilePictureUrl;
        // A password is only changed when a non-empty one is supplied. The hash lives in `userId`.
        if (data.userId) {
            const salt = await generateSalt();
            fields.userId = await hashPassword(data.userId, salt);
        }

        if (Object.keys(fields).length === 0) {
            status = 400;
            throw new Error("No fields to update");
        }

        let patch = auth.elevate(items.patch)(CollectionIds.AGENTS, data._id);
        for (const [key, value] of Object.entries(fields)) {
            patch = patch.setField(key, value);
        }
        const patched = await patch.run() as (Agent & { _id: string }) | undefined;

        if (!patched) {
            status = 404;
            throw new Error(`User not found: ${data._id}`);
        }

        // Explicit whitelist: never return the password hash (stored in `userId`) or internal fields.
        const { _id, email, name, phoneNumber, team, role, profilePictureUrl } = patched;
        const result = { _id, email, name, phoneNumber, team, role, profilePictureUrl };

        return new Response(JSON.stringify({ success: true, user: result }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error updating user' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
}

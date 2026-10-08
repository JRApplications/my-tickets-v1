import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { generateSalt, hashPassword } from "../auth/password-utils";
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';

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

        if (data.userId) {
            const salt = await generateSalt();
            data.userId = await hashPassword(data.userId, salt);
        }

        const updatedAgent = {
            _id: data._id,
            name: data.name || undefined,
            email: data.email ? `${data.email.replace(/@mytickets\.internal$/i, '')}@mytickets.internal` : undefined,
            phoneNumber: data.phoneNumber || undefined,
            role: data.role || undefined,
            team: data.team || undefined,
            profilePictureUrl: data.profilePictureUrl || undefined,
        };
        const result = await items.update(CollectionIds.AGENTS, updatedAgent);

        if (!result) {
            status = 404;
            throw new Error(`User not found: ${data._id}`);
        }

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

import type { APIRoute } from "astro";
import { members } from "@wix/members";
import { captureError } from '../reportError';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) {
            status = 400;
            throw new Error('member ID is required');
        }

        const memberResponse = await members.getMember(id, { fieldsets: [members.Set.FULL] });
        return new Response(JSON.stringify({ success: true, member: memberResponse }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });


    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error fetching members' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};
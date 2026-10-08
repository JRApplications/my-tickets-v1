import type { APIRoute } from 'astro';
import { captureError } from '../reportError';
import { auth } from "@wix/essentials";
import { members } from "@wix/members";

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const memberId = url.searchParams.get('id');
        if (!memberId) {
            status = 400;
            throw new Error('Member ID is required');
        }

        const elevatedBlockMember = auth.elevate(members.blockMember);
        const response = await elevatedBlockMember(memberId);

        if (!response) {
            status = 500;
            throw new Error('Failed to block member');
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, message: 'Internal Server Error' }), { status, headers: { "x-mytickets-request-id": requestId } });
    }
};
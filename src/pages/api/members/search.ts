import type { APIRoute } from "astro";
import { members } from "@wix/members";
import { captureError } from '../reportError';
import { checkPermission } from '../auth/checkPermission';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        const url = new URL(request.url);
        const query = url.searchParams.get('query');

        if (!query) {
            status = 400;
            throw new Error('Query parameter is required');
        }


        let options = {
            fieldsets: [members.Set.FULL],
            search: {
                expression: query,
                fields: ["loginEmail", "contact.firstName", "contact.lastName", "profile.nickname"]
            }
        }
        const memberSearchResponse = await members.queryMembers(options).find();
        return new Response(JSON.stringify({
            success: true,
            members: memberSearchResponse.items.map((item) => ({
                _id: item._id, 
                name: item.contact?.firstName + ' ' + item.contact?.lastName || item.profile?.nickname || '', 
                email: item.loginEmail
            }))
        }), {
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

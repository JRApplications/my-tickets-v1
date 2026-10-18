import type { APIRoute } from 'astro';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';
import { generateElevatedAuthToken } from '../auth/generateElevatedAuthToken';
import { captureError } from '../reportError';
import { fetchTicketItemsPage } from '../tickets/graphql';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const authorized = await checkPermission(request.headers.get('Authorization'), ['USER']);
        if (!authorized) {
            status = 403;
            throw new Error('Forbidden');
        }

        const accessToken = await generateElevatedAuthToken(request.headers.get('Authorization'));
        const result = await fetchTicketItemsPage({
            accessToken,
            dataCollectionId: CollectionIds.AGENTS,
            fields: ['_id'],
            limit: 1,
        });
        return new Response(JSON.stringify({ success: true, needsSetup: result.items.length === 0 }), { status: 200 });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error checking onboarding status' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

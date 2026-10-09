import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const authorized = await checkPermission(request.headers.get('Authorization'), ['USER']);
        if (!authorized) {
            status = 403;
            throw new Error('Forbidden');
        }

        const elevatedQuery = auth.elevate(items.query);
        const result = await elevatedQuery(CollectionIds.AGENTS).limit(1).find();
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

import type { APIRoute } from 'astro';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { getSlaSettings } from '../utils/slaServer';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        const settings = await getSlaSettings();
        return new Response(JSON.stringify({ success: true, settings }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to load SLA settings' }), {
            status,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

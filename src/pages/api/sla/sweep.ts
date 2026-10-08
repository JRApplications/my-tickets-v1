import type { APIRoute } from 'astro';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { runSlaSweep } from '../utils/slaServer';

const MIN_INTERVAL_MS = 60_000;
let running = false;
let lastRunAt = 0;

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        // Several dashboards may call this; the guard keeps one sweep per instance per minute.
        if (running || Date.now() - lastRunAt < MIN_INTERVAL_MS) {
            return new Response(JSON.stringify({ success: true, skipped: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        running = true;
        try {
            const result = await runSlaSweep();
            lastRunAt = Date.now();
            return new Response(JSON.stringify({ success: true, ...result }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } finally {
            running = false;
        }
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to run SLA check' }), {
            status,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

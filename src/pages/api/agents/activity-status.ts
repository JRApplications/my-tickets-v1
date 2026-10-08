import type { APIRoute } from 'astro';
import { publisher } from '@wix/realtime';
import { auth } from '@wix/essentials';
import { captureError } from '../reportError';

type ActivityAction = 'online' | 'busy' | 'offline' | 'roster-request';

export const POST: APIRoute = async ({ request, locals }) => {
    const agentId = locals.myTicketsIdentity?.agentId;
    const teamId = locals.myTicketsIdentity?.teamId;
    if (!agentId || !teamId) return json({ success: false, error: 'Authenticated team agent is required' }, 401);

    try {
        const body = await request.json().catch(() => ({}));
        const action = body?.action as ActivityAction;
        if (!['online', 'busy', 'offline', 'roster-request'].includes(action)) {
            return json({ success: false, error: 'Invalid team activity action' }, 400);
        }
        const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.slice(0, 100) : 'default';

        const elevatedPublish = auth.elevate(publisher.publish);
        const payload = action === 'roster-request'
            ? { type: 'roster-request', agentId }
            : {
                type: 'agent-presence',
                agentId,
                sessionId,
                status: action,
                updatedAt: Date.now(),
            };
        await elevatedPublish({ name: 'AGENT_BACKEND_ACTIVITY_STATUS', resourceId: teamId }, payload);
        return json({ success: true });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return json({ success: false, error: 'Failed to publish team activity', requestId }, 500);
    }
};

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

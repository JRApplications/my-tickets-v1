import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { publisher } from '@wix/realtime';
import { auth } from '@wix/essentials';
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { SYSTEM_ADMIN_NAME, isSystemAdmin } from '../auth/system-admin';

const ACTIONS = ['viewing', 'typing', 'left', 'replied', 'roster-request'] as const;
type PresenceAction = typeof ACTIONS[number];

const NAME_CACHE_TTL_MS = 5 * 60_000;
const nameCache = new Map<string, { name: string; expiresAt: number }>();

const getAgentDisplayName = async (agentId: string): Promise<string> => {
    if (isSystemAdmin(agentId)) return SYSTEM_ADMIN_NAME;
    const cached = nameCache.get(agentId);
    if (cached && cached.expiresAt > Date.now()) return cached.name;
    const agent = await items.get(CollectionIds.AGENTS, agentId);
    const name = typeof agent?.name === 'string' && agent.name.trim() ? agent.name.trim().slice(0, 100) : 'Another agent';
    nameCache.set(agentId, { name, expiresAt: Date.now() + NAME_CACHE_TTL_MS });
    return name;
};

export const POST: APIRoute = async ({ request, locals }) => {
    const agentId = locals.myTicketsIdentity?.agentId;
    if (!agentId) return json({ success: false, error: 'Authenticated agent is required' }, 401);

    try {
        const body = await request.json().catch(() => ({}));
        const ticketId = typeof body?.ticketId === 'string' ? body.ticketId : '';
        const action = body?.action as PresenceAction;
        if (!ticketId || ticketId.length > 100 || !ACTIONS.includes(action)) {
            return json({ success: false, error: 'Ticket ID and a valid presence action are required' }, 400);
        }
        const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.slice(0, 100) : 'default';

        const channel = { name: 'TICKET_PRESENCE', resourceId: ticketId };
        const publish = auth.elevate(publisher.publish);
        if (action === 'roster-request') {
            await publish(channel, { type: 'roster-request', agentId });
        } else {
            const agentName = await getAgentDisplayName(agentId);
            await publish(channel, action === 'replied'
                ? { type: 'ticket-replied', agentId, agentName }
                : { type: 'ticket-presence', agentId, agentName, sessionId, state: action });
        }
        return json({ success: true });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return json({ success: false, error: 'Failed to publish ticket presence', requestId }, 500);
    }
};

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

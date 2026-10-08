import type { APIRoute } from 'astro';
import { isSystemAdmin } from '../auth/system-admin';
import { GET as getTicketAnalytics } from '../tickets/analytics';

export const GET: APIRoute = async (context) => {
    const requestedTeamId = new URL(context.request.url).searchParams.get('teamId');
    const identity = context.locals.myTicketsIdentity;
    const isGlobalSystemAdmin = identity && isSystemAdmin(identity.agentId) && requestedTeamId === 'system_admin';
    if (!identity || !requestedTeamId || (requestedTeamId !== identity.teamId && !isGlobalSystemAdmin)) {
        return new Response(JSON.stringify({ success: false, error: 'Reports are only available for your team.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return getTicketAnalytics(context);
};

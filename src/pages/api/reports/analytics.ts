import type { APIRoute } from 'astro';
import { isSystemAdmin } from '../auth/system-admin';
import { GET as getTicketAnalytics } from '../tickets/analytics';
import { captureError } from '../reportError';

export const GET: APIRoute = async (context) => {
    try {
        const requestedTeamId = new URL(context.request.url).searchParams.get('teamId');
        const identity = context.locals.myTicketsIdentity;
        const isGlobalSystemAdmin = identity && isSystemAdmin(identity.agentId) && requestedTeamId === 'system_admin';
        if (!identity || !requestedTeamId || (requestedTeamId !== identity.teamId && !isGlobalSystemAdmin)) {
            throw new Error('Reports are only available for your team.');
        }
        return getTicketAnalytics(context);
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: context.locals.myTicketsRequestId, request: context.request });
        return new Response(JSON.stringify({ success: false, error: 'Error fetching analytics' }), {
            "status": 500,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

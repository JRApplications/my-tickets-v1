import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { HEADER_NAME, REFRESH_GRACE_PERIOD_SECONDS, issueToken, verifyToken } from './token';
import { isSystemAdmin } from '../auth/system-admin';

// Re-mints a token from an existing (possibly recently-expired) one. The agent
// record is re-read so a team/role change is picked up on refresh instead of
// persisting for the lifetime of the old token.
export const POST: APIRoute = async ({ request, locals }) => {
    let status = 401;
    try {
        const existingToken = request.headers.get(HEADER_NAME);
        if (!existingToken) {
            throw new Error('Missing my-tickets-auth token');
        }

        const identity = await verifyToken(existingToken, { allowExpiredWithinSeconds: REFRESH_GRACE_PERIOD_SECONDS });

        if (isSystemAdmin(identity.agentId)) {
            const refreshed = await issueToken(identity);
            return new Response(JSON.stringify({ success: true, ...refreshed }), { status: 200 });
        }

        const elevatedGet = auth.elevate(items.get);
        const agent = await elevatedGet(CollectionIds.AGENTS, identity.agentId, {
            includeReferences: [{ field: 'team', limit: 1 }, { field: 'role', limit: 1 }]
        });
        if (!agent) {
            status = 404;
            throw new Error('Agent not found');
        }

        const { token, expiresAt } = await issueToken({
            agentId: agent._id,
            teamId: agent.team?._id ?? agent.team,
            roleId: agent.role?._id ?? agent.role,
        });

        return new Response(JSON.stringify({ success: true, token, expiresAt }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error refreshing auth token' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

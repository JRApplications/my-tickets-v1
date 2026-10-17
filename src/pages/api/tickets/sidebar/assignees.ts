import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { captureError } from '../../reportError';
import { checkPermission } from '../../auth/checkPermission';
import { isSystemAdmin } from '../../auth/system-admin';

interface AgentOption {
    _id: string;
    name?: string;
}

const elevatedQuery = auth.elevate(items.query);

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const identity = locals.myTicketsIdentity;
        if (!identity) {
            status = 401;
            throw new Error('My Tickets agent authentication is required');
        }
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient Wix permissions');
        }

        let query = elevatedQuery(CollectionIds.AGENTS);
        if (!isSystemAdmin(identity.agentId)) {
            query = query.eq('team', identity.teamId);
        }

        const agents: AgentOption[] = [];
        let result = await query.fields('_id', 'name').limit(1000).find();
        agents.push(...result.items as AgentOption[]);
        while (result.hasNext()) {
            result = await result.next();
            agents.push(...result.items as AgentOption[]);
        }

        const assignees = agents
            .filter((agent) => typeof agent._id === 'string')
            .map((agent) => ({
                id: agent._id,
                value: agent.name?.trim() || 'Agent',
            }))
            .sort((left, right) => left.value.localeCompare(right.value));

        return new Response(JSON.stringify({ success: true, assignees }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to load ticket assignees' }), {
            status,
            headers: {
                'Content-Type': 'application/json',
                'x-mytickets-request-id': requestId,
            },
        });
    }
};

import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { checkPermission } from '../auth/checkPermission';
import { checkAgentPermission } from '../auth/checkAgentPermission';
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { SYSTEM_ADMIN_ID, isSystemAdmin } from '../auth/system-admin';

interface WorkforceAgentRecord {
    _id: string;
    name?: string;
    team?: string | { _id?: string; id?: string; name?: string };
}

interface WorkforceTicketRecord {
    _id: string;
    teamId?: string;
    status?: string;
    assignedTeam?: { id?: string };
    assignedAgent?: { id?: string };
    isSpam?: boolean;
    isDeleted?: boolean;
}

const getReferenceId = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
        const reference = value as { _id?: unknown; id?: unknown };
        if (typeof reference._id === 'string') return reference._id;
        if (typeof reference.id === 'string') return reference.id;
    }
    return undefined;
};

const normalize = (value?: string) => (value || '').toLowerCase().replace(/[ _-]/g, '');

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const identity = locals.myTicketsIdentity;
        const actorId = identity?.agentId;
        const teamId = identity && (isSystemAdmin(identity.agentId) ? SYSTEM_ADMIN_ID : identity.teamId);
        if (!teamId || !actorId) {
            status = 400;
            throw new Error('Team ID and agent ID are required');
        }
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient Wix permissions');
        }
        if (!(await checkAgentPermission(actorId, 'my-tickets-view-workforce'))) {
            status = 403;
            throw new Error('Insufficient workforce permissions');
        }

        const systemAdmin = isSystemAdmin(actorId) && teamId === SYSTEM_ADMIN_ID;
        if (!systemAdmin) {
            const actor = await items.get(CollectionIds.AGENTS, actorId);
            if (!actor || getReferenceId(actor.team) !== teamId) {
                status = 403;
                throw new Error('Workforce data is limited to the agent team');
            }
        }

        const [agents, tickets] = await Promise.all([getAgents(), getTickets()]);
        const teamAgents = agents.filter((agent) => systemAdmin || getReferenceId(agent.team) === teamId);
        const teamTickets = tickets.filter((ticket) => systemAdmin || ticket.teamId === teamId || ticket.assignedTeam?.id === teamId);
        const activeTickets = teamTickets.filter((ticket) =>
            ticket.isSpam !== true && ticket.isDeleted !== true && ['open', 'inprogress'].includes(normalize(ticket.status)),
        );
        const workloadByAgent = new Map<string, number>();
        for (const ticket of activeTickets) {
            const assignedAgentId = ticket.assignedAgent?.id;
            if (assignedAgentId) workloadByAgent.set(assignedAgentId, (workloadByAgent.get(assignedAgentId) || 0) + 1);
        }

        const responseAgents = teamAgents.map((agent) => ({
            id: agent._id,
            name: agent.name || 'Agent',
            activeTickets: workloadByAgent.get(agent._id) || 0,
        }));

        return new Response(JSON.stringify({
            success: true,
            agents: responseAgents,
            activeTicketCount: activeTickets.length,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to load workforce overview' }), {
            status,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

async function getAgents(): Promise<WorkforceAgentRecord[]> {
    const allAgents: WorkforceAgentRecord[] = [];
    let result = await items.query(CollectionIds.AGENTS).fields('_id', 'name', 'team').include('team').limit(1000).find();
    allAgents.push(...result.items as WorkforceAgentRecord[]);
    while (result.hasNext()) {
        result = await result.next();
        allAgents.push(...result.items as WorkforceAgentRecord[]);
    }
    return allAgents;
}

async function getTickets(): Promise<WorkforceTicketRecord[]> {
    const allTickets: WorkforceTicketRecord[] = [];
    let result = await items.query(CollectionIds.TICKETS)
        .fields('_id', 'teamId', 'status', 'assignedTeam', 'assignedAgent', 'isSpam', 'isDeleted')
        .limit(1000)
        .find();
    allTickets.push(...result.items as WorkforceTicketRecord[]);
    while (result.hasNext()) {
        result = await result.next();
        allTickets.push(...result.items as WorkforceTicketRecord[]);
    }
    return allTickets;
}

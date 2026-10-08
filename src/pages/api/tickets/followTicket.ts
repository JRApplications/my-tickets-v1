import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { captureError } from '../reportError';
import { CollectionIds, type Ticket } from '@jrapps/my_tickets_common_types';
import { SYSTEM_ADMIN_ID, SYSTEM_ADMIN_NAME, isSystemAdmin } from '../auth/system-admin';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const data = await request.json();
        const { ticketId } = data;
        const agentId = locals.myTicketsIdentity?.agentId;

        if (!ticketId || !agentId) {
            status = 400;
            throw new Error('Ticket ID and Agent ID are required');
        }

        const detailedAgent = await getDetailedAgent(agentId);
        if (!detailedAgent) {
            status = 404;
            throw new Error('Detailed agent information not found');
        }

        const ticket: Ticket | null = await items.get(CollectionIds.TICKETS, ticketId, { consistentRead: true });
        if (!ticket) {
            status = 404;
            throw new Error('Ticket not found');
        }

        if (!ticket.agentsFollowing?.some(agent => agent.id === agentId)) {

            await items.patch(CollectionIds.TICKETS, ticketId).appendToArray('agentsFollowing', detailedAgent.agent).run();
        }

        if (!ticket.teamsFollowing?.some(team => team.id === detailedAgent.team.id)) {
            const teamPatch = {
                id: detailedAgent.team.id,
                name: detailedAgent.team.name
            }
            await items.patch(CollectionIds.TICKETS, ticketId).appendToArray('teamsFollowing', teamPatch).run();
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: `Failed to assign agent to ticket` }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

const getDetailedAgent = async (agentId: string) => {
    try {
        if (isSystemAdmin(agentId)) {
            return {
                agent: { id: SYSTEM_ADMIN_ID, name: SYSTEM_ADMIN_NAME },
                team: { id: SYSTEM_ADMIN_ID, name: '' },
            };
        }
        const agent = await items.get(CollectionIds.AGENTS, agentId);
        const team = await items.get(CollectionIds.TEAMS, agent?.team || '');
        if (!team) {
            throw new Error('Team not found for the given agent');
        }

        return {
            agent: {
                id: agent?._id,
                name: agent?.name || '',
            },
            team: {
                id: team?._id,
                name: team?.name || '',
            }
        }
    } catch (error) {
        console.error('Failed to get agent team ID', error);
        return null;
    }
};

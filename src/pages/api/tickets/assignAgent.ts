import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { captureError } from '../reportError';
import { CollectionIds, TimelineMessageType, type Ticket } from '@jrapps/my_tickets_common_types';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const data = await request.json();
        const { ticketId, agentId } = data;

        if (!ticketId || !agentId) {
            status = 400;
            throw new Error('Ticket ID and Agent ID are required');
        }

        const auth = request.headers.get('Authorization') || '';
        const agentAuthToken = request.headers.get('x-my-tickets-auth') || '';
        const url = new URL(request.url);
        const baseUrl = url.origin;
        const updatedTicket = await assignAgentToTicket(ticketId, agentId, baseUrl, auth, agentAuthToken);

        return new Response(JSON.stringify({ success: true, assignedAgent: updatedTicket.assignedAgent, assignedTeam: updatedTicket.assignedTeam }), {
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
}

const assignAgentToTicket = async (ticketId: string, agentId: string, baseUrl: string, auth: any, agentAuthToken: string) => {
    try {
        const ticket = await items.get(CollectionIds.TICKETS, ticketId);
        if (!ticket) {
            throw new Error('Ticket not found');
        }

        if (ticket.assignedAgent.id === agentId) {
            throw new Error('Agent is already assigned to this ticket');
        }

        const detailedAgent = await getDetailedAgent(agentId);
        if (!detailedAgent) {
            throw new Error('Failed to get detailed agent information');
        }

        if (!ticket.assignedTeam || ticket.assignedTeam.id !== detailedAgent.team.id) {
            // no ticket assigned team or assigned team is different from the detailed agent's team, so update it
            await items.patch(CollectionIds.TICKETS, ticketId).setField('assignedTeam', detailedAgent.team).run();
        }

        if (!ticket.assignedAgent || ticket.assignedAgent.id !== detailedAgent.agent.id) {
            // no ticket assigned agent or assigned agent is different from the detailed agent, so update it
            await items.patch(CollectionIds.TICKETS, ticketId).setField('assignedAgent', detailedAgent.agent).run();
        }

        // example agents following = [{ id: 'agentId', name: 'agentName' }]
        // example teams following = [{ id: 'teamId', name: 'teamName' }]
        if (!ticket.agentsFollowing || !ticket.agentsFollowing.some((agent: { id: string; name: string })  => agent.id === detailedAgent.agent.id)) {
            // agent is not following the ticket, so add them to the agentsFollowing array
            await items.patch(CollectionIds.TICKETS, ticketId).appendToArray('agentsFollowing', detailedAgent.agent).run();
        }

        if (!ticket.teamsFollowing || !ticket.teamsFollowing.some((team: { id: string; name: string }) => team.id === detailedAgent.team.id)) {
            // team is not following the ticket, so add them to the teamsFollowing array
            await items.patch(CollectionIds.TICKETS, ticketId).appendToArray('teamsFollowing', detailedAgent.team).run();
        }

        if (!detailedAgent.agent.id) {
            throw new Error('Failed to get detailed agent information');
        }

        await addTicketTimeline(ticketId, detailedAgent.agent.name, detailedAgent.agent.id, baseUrl, auth, agentAuthToken, detailedAgent.team.name);

        const finalUpdate = await items.get(CollectionIds.TICKETS, ticketId);
        return { 
            assignedTeam: finalUpdate?.assignedTeam,
            assignedAgent: finalUpdate?.assignedAgent,
            agentsFollowing: finalUpdate?.agentsFollowing || [],
            teamsFollowing: finalUpdate?.teamsFollowing || [],
            ticketId: finalUpdate?._id,
            primaryTicketNumber: finalUpdate?.primaryTicketNumber,
        } as Partial<Ticket>;
    } catch (error) {
        console.error('Failed to assign agent to ticket', error);
        throw error;
    }
};  

const getDetailedAgent = async (agentId: string) => {
    try {
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

const addTicketTimeline = async (ticketId: string, agentName: string, agentId: string, baseUrl: string, auth: any, agentAuthToken: string, teamName: string) => {
    try {
        const response = await fetch(`${baseUrl}/api/tickets/timeline/addTimeline`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth,
                'x-my-tickets-auth': agentAuthToken,
            },
            body: JSON.stringify({ ticketId, message: `${agentName} from ${teamName} assigned themselves to the ticket`, type: TimelineMessageType.AGENT_ASSIGNED, agentId })
        });
        if (!response.ok) {
            throw new Error('Failed to add ticket timeline');
        }
    } catch (error) {
        console.error('Error adding ticket timeline:', error);
    }
};

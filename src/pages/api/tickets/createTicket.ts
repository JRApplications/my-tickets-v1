import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';
import { items } from '@wix/data';
import { randomUUID } from 'node:crypto';
import { 
    type Ticket, 
    TimelineMessageType, 
    type TimelineMessage, 
    type InternalNote, 
    type CreateTicketPayload, 
    SystemMessageType, 
    CollectionIds ,
    type TicketPriority,
    type TicketStatus
} from '@jrapps/my_tickets_common_types';
import { captureError } from '../reportError';
import { sanitizeText } from '../utils/sanitize';
import { SYSTEM_ADMIN_ID, SYSTEM_ADMIN_NAME, isSystemAdmin } from '../auth/system-admin';
import { getConversation } from '../chat/conversation-auth';
import { initTicketSla, runSlaHook } from '../utils/slaServer';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    const generateSevenDigitNumber = async () => {
        return new Promise<string>((resolve) => {
            const sevenDigitNumber = parseInt(uuidv4().replace(/-/g, ''), 16) % 9000000 + 1000000;
            resolve(sevenDigitNumber.toString());
        });
    }

    try {
        const data = await request.json() as CreateTicketPayload;
        const primaryTicketNumber = await generateSevenDigitNumber();
        const authenticatedAgentId = locals.myTicketsIdentity?.agentId;
        if (!authenticatedAgentId) {
            status = 401;
            throw new Error('Authenticated agent identity is required');
        }
        const { submittingAgent } = await getSubmittingAgent(authenticatedAgentId);
        let chatCommunication: any[] = [];
        if (data.chatConversationId) {
            const conversation = await getConversation(CollectionIds.CHAT_CONVERSATIONS, data.chatConversationId, { fields: ['messages', 'metaData.siteUserId', 'metaData.siteUserType'], consistentRead: true });
            if (!conversation) throw new Error('Chat conversation not found');
            if (conversation.metaData?.siteUserType !== 'member' || conversation.metaData?.siteUserId !== data.member.memberId) {
                status = 400;
                throw new Error('Chat conversation does not belong to the selected member');
            }
            chatCommunication = (conversation.messages || []).map((message: any) => ({
                _id: randomUUID(),
                timestamp: message.timestamp,
                senderName: message.senderName || '',
                senderId: message.senderId || '',
                senderType: message.senderType,
                message: message.message,
                attachment: message.attachment || [],
            }));
            chatCommunication.push({
                _id: randomUUID(),
                timestamp: Date.now(),
                senderName: '',
                senderId: '',
                senderType: 'system',
                message: SystemMessageType.CHAT_CONVERTED_TO_TICKET,
                attachment: [],
            });
        }
        const formattedTicket: Ticket = {
            primaryTicketNumber: primaryTicketNumber,
            subject: data.subject,
            status: data.status as TicketStatus,
            priority: data.priority as TicketPriority,
            memberId: data.member.memberId,
            memberName: data.member.memberName,
            assignedTeam: { id: data.assignedTeam.id, name: data.assignedTeam.name },
            teamsFollowing: getAssignedTeamArray(data.assignedTeam, submittingAgent.team),
            agentsFollowing: [{ id: submittingAgent.agent.id, teamId: submittingAgent.team.id, name: submittingAgent.agent.name }],
            tags: data.tags || [],
            relatedTickets: data.relatedTickets || []
        };
        const ticketCreated = await items.insert(CollectionIds.TICKETS, formattedTicket);
        if (chatCommunication.length) {
            for (const message of chatCommunication) {
                await items.bulkPatch(CollectionIds.TICKETS, [ticketCreated._id])
                    .appendToArray('communication', { ...message, ticketId: ticketCreated._id })
                    .run();
            }
        }
        await addTicketCreatedTimelineEvent(ticketCreated._id);
        await addInternalNoteDescription(ticketCreated._id, data.description, submittingAgent.agent.id, submittingAgent.agent.name);
        await runSlaHook(() => initTicketSla(ticketCreated));
        return new Response(JSON.stringify({ success: true, ticket: ticketCreated }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error creating ticket' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
}

const addInternalNoteDescription = async (ticketId: string, description: string, agentId: string, agentName: string) => {
    try {
        if (!description) {
            throw new Error('Description is required for internal note');
        }

        if (!agentId) {
            throw new Error('Agent ID is required for internal note');
        }
        if (!agentName) {
            throw new Error('Agent Name is required for internal note');
        }

        if (!ticketId) {
            throw new Error('Ticket ID is required for internal note');
        }

        const internalNote: InternalNote = {
            _id: randomUUID(),
            ticketId,
            timestamp: Date.now(),
            senderType: 'agent',
            senderId: agentId,
            senderName: agentName,
            message: await sanitizeText(description)
        };
        await items.bulkPatch(CollectionIds.TICKETS, [ticketId])
            .appendToArray("internalNotes", internalNote)
            .run();
    } catch (error: any) {
        throw new Error('Failed to add internal note: ' + error.message);
    }
};

const addTicketCreatedTimelineEvent = async (ticketId: string) => {
    try {
        if (!ticketId) {
            throw new Error('Ticket ID is required for timeline event');
        }
        const timelineEvent: TimelineMessage = {
            _id: uuidv4(),
            ticketId,
            timestamp: Date.now(),
            type: TimelineMessageType.TICKET_CREATED,
            message: 'Ticket created',
        };
        await items.bulkPatch(CollectionIds.TICKETS, [ticketId])
            .appendToArray("timeline", timelineEvent)
            .run();
    } catch (error: any) {
        throw new Error('Failed to add ticket created timeline event: ' + error.message);
    }
};

const getSubmittingAgent = async (agentId: string) => {
    try {
        if (!agentId) {
            throw new Error('Agent ID is required to get submitting agent');
        }

        if (isSystemAdmin(agentId)) {
            return {
                submittingAgent: {
                    agent: { id: SYSTEM_ADMIN_ID, name: SYSTEM_ADMIN_NAME },
                    team: { id: SYSTEM_ADMIN_ID, name: '' },
                },
            };
        }

        const response = await items.get(CollectionIds.AGENTS, agentId);
        if (!response) {
            throw new Error('Submitting agent not found');
        }

        return {
            submittingAgent: {
                agent: {
                    id: response._id,
                    name: response.name,
                },
                team: {
                    id: response.team?.id || '',
                    name: response.team?.name || '',
                }
            }
        };
    } catch (error: any) {
        throw new Error('Failed to get submitting agent: ' + error.message);
    }
};

const getAssignedTeamArray = (assignedTeam: { id: string; name: string }, submittingAgentTeam: { id: string; name: string }): { id: string; name: string }[] => {
    const teams = [];
    if (assignedTeam.id) {
        teams.push({ id: assignedTeam.id, name: assignedTeam.name });
    }
    if (submittingAgentTeam.id && submittingAgentTeam.id !== assignedTeam.id) {
        teams.push({ id: submittingAgentTeam.id, name: submittingAgentTeam.name });
    }
    return teams;
}

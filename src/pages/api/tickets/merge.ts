import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';
import { items } from '@wix/data';
import { randomUUID } from 'node:crypto';
import {
    type Ticket,
    type MergeTicketsPayload,
    type MergeSummaryObject,
    TimelineMessageType,
    type TimelineMessage,
    type InternalNote,
    type Communication,
    type AssignedAgentObject,
    type TeamsFollowingObject,
    type AgentsFollowingObject,
    CollectionIds,
    type TicketStatus,
    type TicketPriority
} from '@jrapps/my_tickets_common_types';
import { captureError } from '../reportError';
import { SYSTEM_ADMIN_ID, SYSTEM_ADMIN_NAME, isSystemAdmin } from '../auth/system-admin';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;

    try {
        const data = await request.json() as MergeTicketsPayload;

        // Validate merge request
        const validationErrors = await validateMergeRequest(data);
        if (validationErrors.length > 0) {
            return new Response(JSON.stringify({
                success: false,
                errors: validationErrors
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Fetch both tickets
        const primaryTicket = await items.get(CollectionIds.TICKETS, data.primaryTicketId);
        const secondaryTicket = await items.get(CollectionIds.TICKETS, data.secondaryTicketId);

        if (!primaryTicket || !secondaryTicket) {
            return new Response(JSON.stringify({
                success: false,
                error: 'One or both tickets not found'
            }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Generate new ticket number
        const mergedTicketNumber = await generateSevenDigitNumber();
        const mergedTicketId = randomUUID();
        const currentUserId = locals.myTicketsIdentity?.agentId;
        if (!currentUserId) {
            status = 401;
            throw new Error('Authenticated agent identity is required');
        }

        // Merge communication arrays chronologically
        const mergedCommunication = mergeCommunicationArrays(
            primaryTicket.communication || [],
            secondaryTicket.communication || []
        );

        // Merge internal notes arrays chronologically
        const mergedInternalNotes = mergeInternalNotesArrays(
            primaryTicket.internalNotes || [],
            secondaryTicket.internalNotes || []
        );

        // Merge timeline arrays chronologically
        const mergedTimeline = mergeTimelineArrays(
            primaryTicket.timeline || [],
            secondaryTicket.timeline || []
        );

        // Add merge timeline event to merged ticket
        const mergeTimelineEvent: TimelineMessage = {
            _id: uuidv4(),
            ticketId: mergedTicketId,
            timestamp: Date.now(),
            type: TimelineMessageType.TICKET_MERGED,
            message: `Ticket merged from #${primaryTicket.primaryTicketNumber} and #${secondaryTicket.primaryTicketNumber}`
        };
        mergedTimeline.push(mergeTimelineEvent);

        // Merge teams following
        const mergedTeamsFollowing = mergeTeamsFollowing(
            primaryTicket.teamsFollowing || [],
            secondaryTicket.teamsFollowing || []
        );

        // Merge agents following
        const mergedAgentsFollowing = mergeAgentsFollowing(
            primaryTicket.agentsFollowing || [],
            secondaryTicket.agentsFollowing || []
        );

        // Merge tags
        const mergedTags = Array.from(new Set([
            ...(primaryTicket.tags || []),
            ...(secondaryTicket.tags || [])
        ]));

        // Determine final assignment
        const finalAssignedAgent = data.assignedAgentId
            ? await getAgentDetails(data.assignedAgentId)
            : primaryTicket.assignedAgent || null;

        // Create merged ticket
        const mergedTicketData: Ticket = {
            primaryTicketNumber: mergedTicketNumber,
            subject: data.newSubject || `[MERGED] ${primaryTicket.subject} + ${secondaryTicket.subject}`,
            status: (data.finalStatus || primaryTicket.status) as TicketStatus,
            priority: (data.finalPriority || primaryTicket.priority) as TicketPriority,
            memberId: primaryTicket.memberId,
            memberName: primaryTicket.memberName,
            communication: mergedCommunication,
            internalNotes: mergedInternalNotes,
            timeline: mergedTimeline,
            teamsFollowing: mergedTeamsFollowing,
            agentsFollowing: mergedAgentsFollowing,
            assignedAgent: finalAssignedAgent,
            assignedTeam: finalAssignedAgent?.teamId
                ? {
                    id: finalAssignedAgent.teamId,
                    name: (await getTeamName(finalAssignedAgent.teamId)) || ''
                }
                : primaryTicket.assignedTeam || undefined,
            tags: mergedTags,
            mergeSummary: {
                mergedIntoTicketId: mergedTicketId,
                originalTicketIds: [data.primaryTicketId, data.secondaryTicketId],
                mergedAt: Date.now(),
                mergedBy: currentUserId,
                reason: data.reason
            }
        };

        const createdMergedTicket = await items.insert(CollectionIds.TICKETS, mergedTicketData);

        // Update primary ticket
        const primaryMergeSummary: MergeSummaryObject = {
            mergedIntoTicketId: createdMergedTicket._id,
            originalTicketIds: [data.primaryTicketId, data.secondaryTicketId],
            mergedAt: Date.now(),
            mergedBy: currentUserId,
            reason: data.reason
        };

        await items.bulkPatch(CollectionIds.TICKETS, [data.primaryTicketId])
            .setField('status', 'closed')
            .setField('mergeSummary', primaryMergeSummary)
            .appendToArray('timeline', {
                _id: uuidv4(),
                ticketId: data.primaryTicketId,
                timestamp: Date.now(),
                type: TimelineMessageType.TICKET_MERGED,
                message: `This ticket was merged into Ticket #${mergedTicketNumber}`
            } as TimelineMessage)
            .appendToArray('internalNotes', {
                _id: randomUUID(),
                ticketId: data.primaryTicketId,
                timestamp: Date.now(),
                senderType: 'system',
                senderId: 'system',
                senderName: 'System',
                message: `This ticket has been merged into Ticket #${mergedTicketNumber}`
            } as InternalNote)
            .run();

        // Update secondary ticket
        const secondaryMergeSummary: MergeSummaryObject = {
            mergedIntoTicketId: createdMergedTicket._id,
            originalTicketIds: [data.primaryTicketId, data.secondaryTicketId],
            mergedAt: Date.now(),
            mergedBy: currentUserId,
            reason: data.reason
        };

        await items.bulkPatch(CollectionIds.TICKETS, [data.secondaryTicketId])
            .setField('status', 'closed')
            .setField('mergeSummary', secondaryMergeSummary)
            .appendToArray('timeline', {
                _id: uuidv4(),
                ticketId: data.secondaryTicketId,
                timestamp: Date.now(),
                type: TimelineMessageType.TICKET_MERGED,
                message: `This ticket was merged into Ticket #${mergedTicketNumber}`
            } as TimelineMessage)
            .appendToArray('internalNotes', {
                _id: randomUUID(),
                ticketId: data.secondaryTicketId,
                timestamp: Date.now(),
                senderType: 'system',
                senderId: 'system',
                senderName: 'System',
                message: `This ticket has been merged into Ticket #${mergedTicketNumber}`
            } as InternalNote)
            .run();

        return new Response(JSON.stringify({
            success: true,
            mergedTicketId: createdMergedTicket._id,
            mergedTicketNumber: mergedTicketNumber,
            originalTicketIds: [data.primaryTicketId, data.secondaryTicketId]
        }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error merging tickets' }), {
            status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
}

// ============ VALIDATION ============

const validateMergeRequest = async (data: MergeTicketsPayload): Promise<string[]> => {
    const errors: string[] = [];

    if (!data.primaryTicketId) {
        errors.push('Primary ticket ID is required');
    }

    if (!data.secondaryTicketId) {
        errors.push('Secondary ticket ID is required');
    }

    if (data.primaryTicketId === data.secondaryTicketId) {
        errors.push('Cannot merge a ticket with itself');
    }

    if (errors.length > 0) {
        return errors;
    }

    // Fetch tickets to validate further
    const primaryTicket = await items.get(CollectionIds.TICKETS, data.primaryTicketId);
    const secondaryTicket = await items.get(CollectionIds.TICKETS, data.secondaryTicketId);

    if (!primaryTicket) {
        errors.push('Primary ticket not found');
    }

    if (!secondaryTicket) {
        errors.push('Secondary ticket not found');
    }

    if (errors.length > 0) {
        return errors;
    }

    // Check if already merged
    if (primaryTicket?.mergeSummary) {
        errors.push('Primary ticket has already been merged');
    }

    if (secondaryTicket?.mergeSummary) {
        errors.push('Secondary ticket has already been merged');
    }

    // Check if tickets belong to same customer
    if (primaryTicket?.memberId !== secondaryTicket?.memberId) {
        errors.push('Tickets must belong to the same customer');
    }

    // Check if both are closed/resolved (warning, not error)
    if ((primaryTicket?.status === 'closed' || primaryTicket?.status === 'resolved') &&
        (secondaryTicket?.status === 'closed' || secondaryTicket?.status === 'resolved')) {
        errors.push('Cannot merge two tickets that are both closed or resolved');
    }



    return errors;
}

// ============ HELPER FUNCTIONS ============

const generateSevenDigitNumber = async (): Promise<string> => {
    return new Promise<string>((resolve) => {
        const sevenDigitNumber = parseInt(uuidv4().replace(/-/g, ''), 16) % 9000000 + 1000000;
        resolve(sevenDigitNumber.toString());
    });
}

const mergeCommunicationArrays = (arr1: Communication[], arr2: Communication[]): Communication[] => {
    return [...arr1, ...arr2].sort((a, b) => a.timestamp - b.timestamp);
}

const mergeInternalNotesArrays = (arr1: InternalNote[], arr2: InternalNote[]): InternalNote[] => {
    return [...arr1, ...arr2].sort((a, b) => a.timestamp - b.timestamp);
}

const mergeTimelineArrays = (arr1: TimelineMessage[], arr2: TimelineMessage[]): TimelineMessage[] => {
    return [...arr1, ...arr2].sort((a, b) => a.timestamp - b.timestamp);
}

const mergeTeamsFollowing = (arr1: TeamsFollowingObject[], arr2: TeamsFollowingObject[]): TeamsFollowingObject[] => {
    const uniqueTeams = new Map<string, TeamsFollowingObject>();
    [...arr1, ...arr2].forEach(team => {
        if (!uniqueTeams.has(team.id)) {
            uniqueTeams.set(team.id, team);
        }
    });
    return Array.from(uniqueTeams.values());
}

const mergeAgentsFollowing = (arr1: AgentsFollowingObject[], arr2: AgentsFollowingObject[]): AgentsFollowingObject[] => {
    const uniqueAgents = new Map<string, AgentsFollowingObject>();
    [...arr1, ...arr2].forEach(agent => {
        if (!uniqueAgents.has(agent.id)) {
            uniqueAgents.set(agent.id, agent);
        }
    });
    return Array.from(uniqueAgents.values());
}

const getAgentDetails = async (agentId: string): Promise<AssignedAgentObject | null> => {
    try {
        if (isSystemAdmin(agentId)) {
            return { id: SYSTEM_ADMIN_ID, teamId: SYSTEM_ADMIN_ID, name: SYSTEM_ADMIN_NAME };
        }
        const agent = await items.get(CollectionIds.AGENTS, agentId);
        if (!agent) return null;

        return {
            id: agent._id,
            teamId: agent.team?.id || '',
            name: agent.name
        };
    } catch (error: any) {
        return null;
    }
}

const getTeamName = async (teamId: string): Promise<string | null> => {
    try {
        const team = await items.get(CollectionIds.TEAMS, teamId);
        return team?.name || null;
    } catch (error: any) {
        return null;
    }
}

import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { CollectionIds, getSlaSummary, type TicketSla } from '@jrapps/my_tickets_common_types';
import type { MyTicketsIdentity } from '../../my-tickets-auth/token';
import { isSystemAdmin } from '../../auth/system-admin';

export interface TicketListFilters {
    status?: string;
    priority?: string;
    assignee?: string;
    sla?: string;
}

export interface SidebarTicket {
    _id: string;
    primaryTicketId: string;
    subject: string;
    status: string;
    priority: string;
    createdDate?: string;
    memberName?: string;
    assignedAgent?: { id?: string; name?: string };
    assignedTeam?: { id?: string; name?: string };
    tags?: string[];
    isSpam?: boolean;
    isDeleted?: boolean;
    sla?: TicketSla;
}

const elevatedQuery = auth.elevate(items.query);

export const readTicketListFilters = (url: URL): TicketListFilters => ({
    status: url.searchParams.get('status') || undefined,
    priority: url.searchParams.get('priority') || undefined,
    assignee: url.searchParams.get('assignee') || undefined,
    sla: url.searchParams.get('sla') || undefined,
});

export const createScopedTicketQuery = (
    identity: MyTicketsIdentity,
    filters: TicketListFilters,
) => {
    let query = elevatedQuery(CollectionIds.TICKETS);
    if (!isSystemAdmin(identity.agentId)) {
        const teamFilter = items.filter()
            .eq('teamId', identity.teamId)
            .or(items.filter().eq('assignedTeam.id', identity.teamId));
        query = query.and(teamFilter);
    }
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.assignee === 'unassigned') query = query.isEmpty('assignedAgent.id');
    else if (filters.assignee) query = query.eq('assignedAgent.id', filters.assignee);
    return query;
};

export const mapSidebarTicket = (item: object): SidebarTicket => {
    const ticket = item as Record<string, unknown>;
    const id = ticket._id;
    const primaryTicketNumber = ticket.primaryTicketNumber;
    const subject = ticket.subject;
    const status = ticket.status;
    const priority = ticket.priority;
    if (
        typeof id !== 'string' ||
        typeof primaryTicketNumber !== 'string' ||
        typeof subject !== 'string' ||
        typeof status !== 'string' ||
        typeof priority !== 'string'
    ) {
        throw new Error('Ticket data is missing required sidebar fields');
    }

    const createdDate = ticket._createdDate;
    const createdDateValue = createdDate instanceof Date
        ? createdDate.toISOString()
        : typeof createdDate === 'string'
            ? createdDate
            : createdDate && typeof createdDate === 'object' && '$date' in createdDate
                ? createdDate.$date
                : undefined;
    return {
        _id: id,
        primaryTicketId: primaryTicketNumber,
        subject,
        status,
        priority,
        createdDate: typeof createdDateValue === 'string' ? createdDateValue : undefined,
        memberName: typeof ticket.memberName === 'string' ? ticket.memberName : undefined,
        assignedAgent: ticket.assignedAgent as SidebarTicket['assignedAgent'],
        assignedTeam: ticket.assignedTeam as SidebarTicket['assignedTeam'],
        tags: Array.isArray(ticket.tags) ? ticket.tags.filter((tag): tag is string => typeof tag === 'string') : [],
        isSpam: ticket.isSpam === true,
        isDeleted: ticket.isDeleted === true,
        sla: ticket.sla as TicketSla | undefined,
    };
};

export const isVisibleSidebarTicket = (ticket: SidebarTicket, filters: TicketListFilters): boolean =>
    ticket.isSpam !== true &&
    ticket.isDeleted !== true &&
    (!filters.sla || getSlaSummary(ticket.sla)?.state === filters.sla);

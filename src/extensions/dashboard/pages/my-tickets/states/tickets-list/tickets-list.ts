import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import type { TicketSla } from '@jrapps/my_tickets_common_types';

export interface TicketsListItem {
    primaryTicketId: string;
    _id: string;
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

export interface TicketAssigneeOption {
    id: string;
    value: string;
}

export interface TicketPageFilters {
    status?: string;
    priority?: string;
    assignee?: string;
    sla?: string;
    sortOrder?: 'newest' | 'oldest';
}

export interface TicketPageQuery {
    teamId: string;
    limit: number;
    cursor?: string;
    search?: string;
    filters: TicketPageFilters;
}

interface TicketPageResponse {
    success?: unknown;
    tickets?: unknown;
    nextCursor?: unknown;
    error?: unknown;
}

const baseApiUrl = new URL(import.meta.url).origin;
const ALL = 'all';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isTicketListItem = (value: unknown): value is TicketsListItem =>
    isRecord(value) &&
    typeof value._id === 'string' &&
    typeof value.primaryTicketId === 'string' &&
    typeof value.subject === 'string' &&
    typeof value.status === 'string' &&
    typeof value.priority === 'string';

export const fetchTicketPage = async (query: TicketPageQuery): Promise<{
    items: TicketsListItem[];
    cursor: string | undefined;
}> => {
    if (!query.teamId) {
        throw new Error('Ticket team context is unavailable');
    }

    const params = new URLSearchParams();
    params.set('limit', String(query.limit));
    if (query.cursor) params.set('cursor', query.cursor);

    for (const [key, value] of Object.entries(query.filters)) {
        if (value && value !== ALL) params.set(key, value);
    }

    const search = query.search?.trim();
    const endpoint = search ? 'search' : 'get';
    if (search) {
        params.set('query', search);
    } else {
        params.set('teamId', query.teamId);
    }

    const response = await myTicketsFetchWithAuth(
        `${baseApiUrl}/api/tickets/sidebar/${endpoint}?${params.toString()}`,
    );
    const payload: TicketPageResponse = await response.json();
    if (
        !response.ok ||
        payload.success !== true ||
        !Array.isArray(payload.tickets) ||
        !payload.tickets.every(isTicketListItem)
    ) {
        const message = typeof payload.error === 'string'
            ? payload.error
            : `Failed to load tickets (${response.status})`;
        throw new Error(message);
    }

    return {
        items: payload.tickets,
        cursor: typeof payload.nextCursor === 'string' ? payload.nextCursor : undefined,
    };
};

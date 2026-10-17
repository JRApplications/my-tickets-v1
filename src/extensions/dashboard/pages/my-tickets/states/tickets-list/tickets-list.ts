import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import type { TicketSla } from '@jrapps/my_tickets_common_types';

interface Ticket {
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

export interface TicketListFilters {
    status: string;
    priority: string;
    assignee: string;
    sla: string;
    sortOrder: 'newest' | 'oldest';
}

type TicketListFilter = keyof TicketListFilters;
export interface TicketAssigneeOption {
    id: string;
    value: string;
}

const ALL = 'all';
const baseApiUrl = new URL(import.meta.url).origin;

const createFilterParams = (filters: TicketListFilters) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value && value !== ALL) params.set(key, value);
    }
    return params;
};

const readTicketResponse = async (response: Response): Promise<{ tickets: Ticket[]; nextCursor: string | null }> => {
    const data = await response.json();
    if (!response.ok || !data.success || !Array.isArray(data.tickets)) {
        throw new Error(data.error || `Failed to load tickets (${response.status})`);
    }
    return { tickets: data.tickets, nextCursor: data.nextCursor || null };
};

export const useTicketsList = (teamId: string, initialSlaFilter: string) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState<TicketListFilters>({
        status: ALL,
        priority: ALL,
        assignee: ALL,
        sla: initialSlaFilter,
        sortOrder: 'newest',
    });
    const [assigneeOptions, setAssigneeOptions] = useState<TicketAssigneeOption[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const requestId = useRef(0);

    useEffect(() => {
        const currentRequestId = ++requestId.current;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const fetchTickets = async () => {
            setIsLoading(true);
            setIsLoadingMore(false);
            setIsError(false);
            setNextCursor(null);
            if (!teamId) {
                setIsLoading(false);
                setIsError(true);
                return;
            }

            try {
                const params = createFilterParams(filters);
                const normalizedSearch = searchTerm.trim();
                const endpoint = normalizedSearch ? 'search' : 'get';
                if (normalizedSearch) params.set('query', normalizedSearch);
                const response = await myTicketsFetchWithAuth(
                    `${baseApiUrl}/api/tickets/sidebar/${endpoint}?${params.toString()}`,
                );
                const result = await readTicketResponse(response);
                if (requestId.current !== currentRequestId) return;
                setTickets(result.tickets);
                setNextCursor(normalizedSearch ? null : result.nextCursor);
            } catch (error) {
                if (requestId.current !== currentRequestId) return;
                console.error("Failed to fetch tickets", error);
                setTickets([]);
                setIsError(true);
            } finally {
                if (requestId.current === currentRequestId) setIsLoading(false);
            }
        };

        if (searchTerm.trim()) {
            setIsLoading(true);
            timer = setTimeout(() => { void fetchTickets(); }, 250);
        } else {
            void fetchTickets();
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [teamId, filters, searchTerm]);

    useEffect(() => {
        let isCurrent = true;
        setAssigneeOptions([]);
        const loadAssignees = async () => {
            try {
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/sidebar/assignees`);
                const data = await response.json();
                if (!response.ok || !data.success || !Array.isArray(data.assignees)) {
                    throw new Error(data.error || `Failed to load assignees (${response.status})`);
                }
                if (isCurrent) setAssigneeOptions(data.assignees);
            } catch (error) {
                if (!isCurrent) return;
                console.error('Failed to load ticket assignees', error);
                const message = error instanceof Error ? error.message : 'Failed to load ticket assignees';
                ShowToast({ message, type: 'error' });
            }
        };
        void loadAssignees();
        return () => { isCurrent = false; };
    }, [teamId]);

    const loadMore = async () => {
        if (!nextCursor || isLoadingMore || searchTerm.trim()) return;
        const currentRequestId = requestId.current;
        setIsLoadingMore(true);
        try {
            const params = createFilterParams(filters);
            params.set('cursor', nextCursor);
            const response = await myTicketsFetchWithAuth(
                `${baseApiUrl}/api/tickets/sidebar/get?${params.toString()}`,
            );
            const page = await readTicketResponse(response);
            if (requestId.current !== currentRequestId) return;
            setTickets((current) => [...current, ...page.tickets]);
            setNextCursor(page.nextCursor);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load more tickets';
            ShowToast({ message, type: 'error' });
        } finally {
            if (requestId.current === currentRequestId) setIsLoadingMore(false);
        }
    };

    const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleClear = () => {
        setSearchTerm('');
        setIsError(false);
    };

    const setFilter = useCallback((filter: TicketListFilter, value: string) => {
        setFilters((current) => ({ ...current, [filter]: value }));
    }, []);

    const updateTicket = useCallback((ticketId: string, updates: {
        status?: string;
        priority?: string;
        isSpam?: boolean;
        isDeleted?: boolean;
        assignedAgent?: { id?: string; name?: string };
        assignedTeam?: { id?: string; name?: string };
    }) => {
        setTickets((current) => current.map((ticket) =>
            ticket._id === ticketId ? { ...ticket, ...updates } : ticket,
        ));
    }, []);

    return {
        tickets,
        assigneeOptions,
        filters,
        setFilter,
        isLoading,
        isError,
        searchTerm,
        handleSearch,
        handleClear,
        updateTicket,
        loadMore,
        hasMore: Boolean(nextCursor),
        isLoadingMore,
    };
};

export type TicketsListItem = Ticket;

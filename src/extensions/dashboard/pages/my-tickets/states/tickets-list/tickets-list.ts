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

const ticketsCache = new Map<string, Ticket[]>();
const cacheKey = (teamId: string) => `my-tickets:tickets-list:${teamId}`;

const readCachedTickets = (teamId: string): Ticket[] | null => {
    if (!teamId) return null;
    const cached = ticketsCache.get(teamId);
    if (cached) return cached;
    try {
        const parsed = JSON.parse(window.sessionStorage.getItem(cacheKey(teamId)) ?? 'null');
        if (!Array.isArray(parsed)) return null;
        ticketsCache.set(teamId, parsed);
        return parsed;
    } catch {
        return null;
    }
};

const writeCachedTickets = (teamId: string, tickets: Ticket[]) => {
    if (!teamId) return;
    ticketsCache.set(teamId, tickets);
    try {
        window.sessionStorage.setItem(cacheKey(teamId), JSON.stringify(tickets));
    } catch {
        // Keep the in-memory cache available if browser storage is restricted.
    }
};

const searchTickets = async (query: string, teamId: string): Promise<any[]> => {
    const baseApiUrl = new URL(import.meta.url).origin;
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/sidebar/search?query=${encodeURIComponent(query)}&teamId=${encodeURIComponent(teamId)}`);
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error);
    }
    return data.tickets || [];
};

export const useTicketsList = (teamId: string) => {
    const [initialCache] = useState(() => readCachedTickets(teamId));
    const [tickets, setTickets] = useState<Ticket[]>(initialCache ?? []);
    const [isLoading, setIsLoading] = useState(initialCache === null);
    const [isError, setIsError] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [originalTickets, setOriginalTickets] = useState<Ticket[]>(initialCache ?? []);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const searchRequestId = useRef(0);

    useEffect(() => {
        const fetchTickets = async () => {
            const cached = readCachedTickets(teamId);
            setTickets(cached ?? []);
            setOriginalTickets(cached ?? []);
            setIsLoading(cached === null);
            setIsError(false);
            if (!teamId) {
                setIsLoading(false);
                setIsError(true);
                return;
            }
            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/sidebar/get?teamId=${teamId}`);
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || `Failed to load tickets (${response.status})`);
                }
                setTickets(data.tickets || []);
                setOriginalTickets(data.tickets || []);
                setNextCursor(data.nextCursor || null);
                writeCachedTickets(teamId, data.tickets || []);
            } catch (error) {
                console.error("Failed to fetch tickets", error);
                setIsError(cached === null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTickets();
    }, [teamId]);

    const loadMore = async () => {
        if (!nextCursor || isLoadingMore || searchTerm) return;
        setIsLoadingMore(true);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/sidebar/get?teamId=${encodeURIComponent(teamId)}&cursor=${encodeURIComponent(nextCursor)}`);
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load more tickets');
            const page = data.tickets || [];
            setTickets((current) => [...current, ...page]);
            setOriginalTickets((current) => [...current, ...page]);
            writeCachedTickets(teamId, [...(readCachedTickets(teamId) ?? []), ...page]);
            setNextCursor(data.nextCursor || null);
        } catch (error: any) {
            ShowToast({ message: error.message || 'Failed to load more tickets', type: 'error' });
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleOutOfTeamSearch = async (value: string, requestId: number) => {
        try {
            const results = await searchTickets(value, teamId);
            if (requestId === searchRequestId.current) {
                setTickets(results);
            }
        } catch (error: any) {
            if (requestId !== searchRequestId.current) return;
            console.error(error.message)
            ShowToast({ message: error.message, type: 'error' });
            setTickets([]);
        }
    };

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const requestId = ++searchRequestId.current;
        setSearchTerm(value);
        if (!value) {
            setTickets(originalTickets);
            return;
        }
        const lowerSearchTerm = value.toLowerCase();
        const filtered = originalTickets.filter(ticket =>
            ticket.primaryTicketId === lowerSearchTerm ||
            ticket.subject.toLowerCase().includes(lowerSearchTerm)
        );
        if (filtered.length === 0) {
            setTickets([]);
            handleOutOfTeamSearch(value, requestId);
        } else {
            setTickets(filtered);
        }
    };

    const handleClear = () => {
        searchRequestId.current++;
        setSearchTerm('');
        setTickets(originalTickets);
        setIsError(false);
    };

    const updateTicket = useCallback((ticketId: string, updates: { status?: string; priority?: string; isSpam?: boolean; isDeleted?: boolean; assignedAgent?: { id?: string; name?: string }; assignedTeam?: { id?: string; name?: string } }) => {
        setTickets(prevTickets =>
            prevTickets.map(ticket =>
                ticket._id === ticketId
                    ? { ...ticket, ...updates }
                    : ticket
            )
        );
        setOriginalTickets(prevTickets =>
            prevTickets.map(ticket =>
                ticket._id === ticketId
                    ? { ...ticket, ...updates }
                    : ticket
            )
        );
        const cached = readCachedTickets(teamId);
        if (cached) {
            writeCachedTickets(teamId, cached.map((ticket) => ticket._id === ticketId ? { ...ticket, ...updates } : ticket));
        }
    }, [teamId]);

  
    return { tickets, isLoading, isError, searchTerm, handleSearch, handleClear, updateTicket, loadMore, hasMore: Boolean(nextCursor), isLoadingMore };
};

export type TicketsListItem = Ticket;

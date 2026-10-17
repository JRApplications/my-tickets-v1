import { useState, useEffect, useCallback, useRef } from 'react';
import { httpClient } from '@wix/essentials';

interface TicketListFilters {
    search?: string;
    status?: string;
}

export const useMemberTickets = () => {
    const [state, setState] = useState<'loading' | 'error' | 'noTickets' | 'selectedTicketLoading' | 'selectedTicket' | 'tickets'>('loading');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoadingMoreTickets, setIsLoadingMoreTickets] = useState(false);
    const [ticketListError, setTicketListError] = useState<string | null>(null);
    const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
    const loadingMoreRef = useRef(false);
    const requestSequenceRef = useRef(0);
    const activeFiltersRef = useRef<TicketListFilters>({});

    // Fetch a single ticket's full details whenever a ticket is selected
    useEffect(() => {
        const fetchSelectedTicket = async () => {
            if (!selectedTicketId) {
                return;
            }

            setState('selectedTicketLoading');

            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/memberTickets/get?ticketId=${selectedTicketId}`);
                const data = await response.json();
                setSelectedTicket(data.ticket);
                setState('selectedTicket');
            } catch (error) {
                console.error('Failed to fetch selected ticket:', error);
                // fall back to the tickets list rather than getting stuck loading
                setState('tickets');
            }
        };

        fetchSelectedTicket();
    }, [selectedTicketId]);

    const fetchTicketPage = useCallback(async (page: number, filters: TicketListFilters, append: boolean) => {
        const requestId = ++requestSequenceRef.current;
        if (append) {
            setIsLoadingMoreTickets(true);
            setLoadMoreError(null);
        } else {
            setState('loading');
            setTicketListError(null);
        }

        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const params = new URLSearchParams({ page: String(page) });
            if (filters.search) params.set('search', filters.search);
            if (filters.status) params.set('status', filters.status);
            const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/memberTickets/get?${params}`);
            const data = await response.json();
            if (!response.ok || !data.success || !Array.isArray(data.tickets)) {
                throw new Error(data.error || 'Unable to load tickets');
            }

            if (requestId !== requestSequenceRef.current) return;
            setTickets((currentTickets) => append ? [...currentTickets, ...data.tickets] : data.tickets);
            setCurrentPage(page);
            setTotalPages(Number.isInteger(data.totalPages) && data.totalPages >= 0 ? data.totalPages : page);
            setState(data.tickets.length > 0 || filters.search || filters.status ? 'tickets' : 'noTickets');
        } catch (error) {
            console.error(append ? 'Failed to load more tickets:' : 'Failed to load tickets:', error);
            if (requestId === requestSequenceRef.current) {
                if (append) {
                    setLoadMoreError('Unable to load more tickets. Please try again.');
                } else {
                    setTicketListError('Unable to load tickets. Please try again.');
                    setState('error');
                }
            }
        } finally {
            if (append && requestId === requestSequenceRef.current) loadingMoreRef.current = false;
            if (requestId === requestSequenceRef.current) setIsLoadingMoreTickets(false);
        }
    }, []);

    const loadTickets = useCallback((filters: TicketListFilters = {}) => {
        const normalizedFilters = {
            search: filters.search?.trim() || '',
            status: filters.status?.trim() || '',
        };
        activeFiltersRef.current = normalizedFilters;
        loadingMoreRef.current = false;
        setIsLoadingMoreTickets(false);
        setLoadMoreError(null);
        void fetchTicketPage(1, normalizedFilters, false);
    }, [fetchTicketPage]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const loadMoreTickets = useCallback(() => {
        if (loadingMoreRef.current || currentPage >= totalPages) return;
        loadingMoreRef.current = true;
        void fetchTicketPage(currentPage + 1, activeFiltersRef.current, true);
    }, [currentPage, fetchTicketPage, totalPages]);

    const retryTickets = useCallback(() => loadTickets(activeFiltersRef.current), [loadTickets]);

    const selectTicket = (ticketId: string) => {
        setSelectedTicketId(ticketId);
    };

    const clearSelectedTicket = () => {
        setSelectedTicketId(null);
        setSelectedTicket(null);
        setState(tickets.length === 0 ? 'noTickets' : 'tickets');
    };

    const sendMessage = async (message: string) => {
        const baseApiUrl = new URL(import.meta.url).origin;
        const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/memberTickets/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId: selectedTicketId, message }),
        });
        const data = await response.json();
        if (!data.success) {
            console.error('Failed to send message:', data.error);
        }
        if (data.success) {
            setSelectedTicket((prev: any) => ({
                ...prev,
                communication: [...(prev?.communication || []), data.message],
            }));
        }
        return data;
    };

    return {
        state,
        setState,
        selectedTicket,
        selectedTicketId,
        setSelectedTicketId,
        selectTicket,
        clearSelectedTicket,
        tickets,
        setTickets,
        hasMoreTickets: currentPage < totalPages,
        isLoadingMoreTickets,
        ticketListError,
        loadMoreError,
        loadTickets,
        retryTickets,
        loadMoreTickets,
        sendMessage,
    };
};

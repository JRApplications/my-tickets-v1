import { useState, useEffect, useCallback, useRef } from 'react';
import { httpClient } from '@wix/essentials';
import type { Communication } from '@jrapps/my_tickets_common_types';

interface TicketListFilters {
    search?: string;
    status?: string;
}

export const useMemberTickets = () => {
    const [state, setState] = useState<'loading' | 'error' | 'noTickets' | 'selectedTicketLoading' | 'selectedTicketError' | 'selectedTicket' | 'tickets'>('loading');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [selectedTicketError, setSelectedTicketError] = useState<string | null>(null);
    const [selectedTicketRetryCount, setSelectedTicketRetryCount] = useState(0);
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
        let isActive = true;
        const fetchSelectedTicket = async () => {
            if (!selectedTicketId) {
                return;
            }

            setState('selectedTicketLoading');
            setSelectedTicketError(null);

            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await httpClient.fetchWithAuth(
                    `${baseApiUrl}/api/memberTickets/get?ticketId=${encodeURIComponent(selectedTicketId)}`
                );
                const data: { ticket?: any; error?: string } = await response.json();
                if (!response.ok || !data.ticket) {
                    throw new Error(data.error || 'Unable to load ticket details');
                }
                if (!isActive) return;
                setSelectedTicket(data.ticket);
                setState('selectedTicket');
            } catch (error) {
                if (!isActive) return;
                console.error('Failed to fetch selected ticket:', error);
                setSelectedTicketError('Unable to load this ticket. Please try again.');
                setState('selectedTicketError');
            }
        };

        fetchSelectedTicket();
        return () => {
            isActive = false;
        };
    }, [selectedTicketId, selectedTicketRetryCount]);

    const retrySelectedTicket = useCallback(() => {
        setSelectedTicketRetryCount((count) => count + 1);
    }, []);

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
        if (!selectedTicketId) {
            throw new Error('No ticket is selected');
        }
        const baseApiUrl = new URL(import.meta.url).origin;
        const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/memberTickets/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId: selectedTicketId, message }),
        });
        const data: { success?: boolean; error?: string; message?: Communication } = await response.json();
        if (!response.ok || !data.success || !data.message) {
            throw new Error(data.error || `Unable to send reply (HTTP ${response.status})`);
        }
        setSelectedTicket((prev: any) => prev ? ({
            ...prev,
            communication: [...(prev.communication || []), data.message],
        }) : prev);
    };

    return {
        state,
        setState,
        selectedTicket,
        selectedTicketError,
        selectedTicketId,
        setSelectedTicketId,
        selectTicket,
        retrySelectedTicket,
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

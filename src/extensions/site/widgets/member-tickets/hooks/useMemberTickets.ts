import { useState, useEffect } from 'react';
import { httpClient } from '@wix/essentials';

export const useMemberTickets = () => {
    const [state, setState] = useState<'loading' | 'noTickets' | 'selectedTicketLoading' | 'selectedTicket' | 'tickets'>('tickets');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);

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

    // Fetch the member's ticket list on mount
    useEffect(() => {
        const fetchTickets = async () => {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/memberTickets/get`);
            const data = await response.json();
            if (data.success) {
                setTickets(data.tickets && data.tickets.length > 0 ? data.tickets : []);
            }
        };

        fetchTickets();
    }, []);

    // Keep state in sync with whether tickets exist, but don't clobber
    // the selectedTicket / selectedTicketLoading states
    useEffect(() => {
        setState((prevState) => {
            if (prevState === 'selectedTicket' || prevState === 'selectedTicketLoading') {
                return prevState;
            }
            return tickets.length === 0 ? 'noTickets' : 'tickets';
        });
    }, [tickets]);

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
        sendMessage,
    };
};
import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import type { TicketSla } from '@jrapps/my_tickets_common_types';

interface Ticket {
    primaryTicketId: string;
    _id: string;
    subject: string;
    status: string;
    priority: string;
    assignedAgent?: { id?: string; name?: string };
    assignedTeam?: { id?: string; name?: string };
    tags?: string[];
    isSpam?: boolean;
    isDeleted?: boolean;
    sla?: TicketSla;
}

const searchTickets = async (query: string, teamId: string): Promise<any[]> => {
    const baseApiUrl = new URL(import.meta.url).origin;
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/sidebar/search?query=${encodeURIComponent(query)}&teamId=${encodeURIComponent(teamId)}`);
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error);
    }
    return data.tickets || [];
};

export const useTicketsSidebar = (teamId: string) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [originalTickets, setOriginalTickets] = useState<Ticket[]>([]); 
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const searchRequestId = useRef(0);

    useEffect(() => {
        const fetchTickets = async () => {
            setIsLoading(true);
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
            } catch (error) {
                console.error("Failed to fetch tickets", error);
                setIsError(true);
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

    const updateTicket = (ticketId: string, updates: { status?: string; priority?: string; isSpam?: boolean; isDeleted?: boolean; assignedAgent?: { id?: string; name?: string }; assignedTeam?: { id?: string; name?: string } }) => {
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
    };

    const demoTickets = [
        {
            _id: 'demo-ticket-1',
            primaryTicketId: '1234567',
            subject: 'Demo Ticket Subject',
            status: 'Open',
            priority: 'High'
        },
        {
            _id: 'demo-ticket-2',
            primaryTicketId: '1234568',
            subject: 'Another Demo Ticket Subject',
            status: 'In Progress',
            priority: 'Medium'
        },
        {
            _id: 'demo-ticket-3',
            primaryTicketId: '1234569',
            subject: 'Yet Another Demo Ticket Subject',
            status: 'Closed',
            priority: 'Low'
        },
        {
            _id: 'demo-ticket-4',
            primaryTicketId: '1234570',
            subject: 'Final Demo Ticket Subject',
            status: 'Open',
            priority: 'High'
        },
        {
            _id: 'demo-ticket-5',
            primaryTicketId: '1234571',
            subject: 'Additional Demo Ticket Subject',
            status: 'In Progress',
            priority: 'Medium'
        },
        {
            _id: 'demo-ticket-6',
            primaryTicketId: '1234572',
            subject: 'Yet Another Additional Demo Ticket Subject',
            status: 'Closed',
            priority: 'Low'
        },
        {
            _id: 'demo-ticket-7',
            primaryTicketId: '1234573',
            subject: 'Final Additional Demo Ticket Subject',
            status: 'Open',
            priority: 'High'
        },
        {
            _id: 'demo-ticket-8',
            primaryTicketId: '1234574',
            subject: 'Another Final Additional Demo Ticket Subject',
            status: 'In Progress',
            priority: 'Medium'
        },
        {
            _id: 'demo-ticket-9',
            primaryTicketId: '1234575',
            subject: 'Yet Another Final Additional Demo Ticket Subject',
            status: 'Closed',
            priority: 'Low'
        },
        {
            _id: 'demo-ticket-10',
            primaryTicketId: '1234576',
            subject: 'Final Demo Ticket Subject for Ten',
            status: 'Open',
            priority: 'High'
        },
        {
            _id: 'demo-ticket-11',
            primaryTicketId: '1234577',
            subject: 'Additional Demo Ticket Subject for Eleven',
            status: 'In Progress',
            priority: 'Medium'
        },
        {
            _id: 'demo-ticket-12',
            primaryTicketId: '1234578',
            subject: 'Final Demo Ticket Subject for Twelve',
            status: 'Closed',
            priority: 'Low'
        }
    ]

    return { tickets, demoTickets, isLoading, isError, searchTerm, handleSearch, handleClear, updateTicket, loadMore, hasMore: Boolean(nextCursor), isLoadingMore };
};

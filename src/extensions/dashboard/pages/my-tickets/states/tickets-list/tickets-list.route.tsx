import { useEffect, useState } from 'react';
import { useTicketsList } from './tickets-list';
import TicketsListWrapper from './tickets-list.wrapper';

const ALL = 'all';
const FILTERS_STORAGE_KEY = 'my-tickets:sidebar-filters';

const readSavedSlaFilter = () => {
    try {
        const saved = JSON.parse(window.localStorage.getItem(FILTERS_STORAGE_KEY) ?? '{}');
        return typeof saved.sla === 'string' ? saved.sla : ALL;
    } catch {
        return ALL;
    }
};

interface TicketsListProps {
    teamId: string;
    permissions: string[];
    onTicketClick: (ticketId: string) => void;
    onCreateTicket: () => void;
    isTicketLimitReached?: boolean;
    onVisibleTicketsChange?: (ticketIds: string[]) => void;
    onGetTicketUpdateFn?: (updateFn: (ticketId: string, updates: { status?: string; priority?: string; isSpam?: boolean; isDeleted?: boolean; assignedAgent?: { id?: string; name?: string }; assignedTeam?: { id?: string; name?: string } }) => void) => void;
}

const TicketsList = ({ teamId, permissions, onTicketClick, onCreateTicket, isTicketLimitReached, onVisibleTicketsChange, onGetTicketUpdateFn }: TicketsListProps) => {
    const [initialSlaFilter] = useState(readSavedSlaFilter);
    const ticketsState = useTicketsList(teamId, initialSlaFilter);
    const { updateTicket, ...listProps } = ticketsState;

    useEffect(() => {
        onGetTicketUpdateFn?.(updateTicket);
    }, [onGetTicketUpdateFn, updateTicket]);

    return (
        <TicketsListWrapper
            {...listProps}
            permissions={permissions}
            onTicketClick={onTicketClick}
            onCreateTicket={onCreateTicket}
            isTicketLimitReached={isTicketLimitReached}
            onVisibleTicketsChange={onVisibleTicketsChange}
        />
    );
};

export default TicketsList;

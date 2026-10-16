import { useEffect } from 'react';
import { useTicketsList } from './tickets-list';
import TicketsListWrapper from './tickets-list.wrapper';

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
    const ticketsState = useTicketsList(teamId);
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

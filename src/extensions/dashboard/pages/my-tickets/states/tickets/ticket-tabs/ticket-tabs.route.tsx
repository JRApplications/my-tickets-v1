import TicketTabsWrapper from './ticket-tabs.wrapper';

interface TicketTabsProps {
    onSelect?: (ticketId: string | null) => void;
    currentTicketId?: string;
    currentTicketDisplayId?: string;
    onPreviousTicket?: () => void;
    onNextTicket?: () => void;
}

const TicketTabs = ({
    onSelect,
    currentTicketId,
    currentTicketDisplayId,
    onPreviousTicket,
    onNextTicket,
}: TicketTabsProps) => {
    return (
        <TicketTabsWrapper
            onSelect={onSelect}
            currentTicketId={currentTicketId}
            currentTicketDisplayId={currentTicketDisplayId}
            onPreviousTicket={onPreviousTicket}
            onNextTicket={onNextTicket}
        />
    );
};

export default TicketTabs;


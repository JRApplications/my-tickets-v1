import { Button, Card, IconButton, Tabs } from '@wix/design-system';
import { X } from '@wix/wix-ui-icons-common';
import './ticket-tabs.css';
import { useTicketTabs } from './ticket-tabs';


interface TicketTabsWrapperProps {
    onSelect?: (ticketId: string | null) => void;
    currentTicketId?: string;
    currentTicketDisplayId?: string;
    onPreviousTicket?: () => void;
    onNextTicket?: () => void;
}

const TicketTabsWrapper = ({
    onSelect,
    currentTicketId,
    currentTicketDisplayId,
    onPreviousTicket,
    onNextTicket,
}: TicketTabsWrapperProps) => {
    const {
        selectedTicketId,
        tickets,
        onSelectedTab,
        onTicketRemove,
    } = useTicketTabs(
        onSelect,
        currentTicketId,
        currentTicketDisplayId,
    );

    if (tickets.length === 0) {
        return null;
    }

    const tabs = tickets.map((ticket) => ({
        id: ticket._id,
        title: ticket.ticketId,
        disabled: false,
        suffix: (
            <IconButton
                size="tiny"
                skin="transparent"
                priority="secondary"
                onClick={(event) => {
                    event.stopPropagation();
                    onTicketRemove(ticket._id);
                }}
            >
                <X fill="black" />
            </IconButton>
        ),
    }));

    return (
        <Card className="ticket-tabs-wrapper-card">
            <Card.Content size='none'>
                <div className="tabs-wrapper-container">
                    <div className="ticket-tabs-list">
                        <Tabs
                            items={tabs}
                            size="small"
                            activeId={selectedTicketId ?? undefined}
                            onClick={(item) => {
                                if (item.id !== selectedTicketId) {
                                    onSelectedTab(String(item.id));
                                }
                            }}
                        />
                    </div>
                    <div className="ticket-navigation-buttons">
                        <Button size="small" priority="secondary" onClick={onPreviousTicket} disabled={!onPreviousTicket}>
                            Previous
                        </Button>
                        <Button size="small" priority="secondary" onClick={onNextTicket} disabled={!onNextTicket}>
                            Next
                        </Button>
                    </div>
                </div>
            </Card.Content>
        </Card>

    );
};

export default TicketTabsWrapper;

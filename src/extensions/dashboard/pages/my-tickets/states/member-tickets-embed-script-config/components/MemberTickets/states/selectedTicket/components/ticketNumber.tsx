import classNames from "classnames";
import styles from './components.module.css';

interface TicketNumberProps {
    ticketNumber: string;
}

export const TicketNumber = ({ ticketNumber }: TicketNumberProps) => {
    return (
        <span className={classNames("selectedTicketTicketNumber", styles.ticketNumber)} data-design-element="ticketNumber" data-design-id="selected-ticket-number">{`#${ticketNumber}`}</span>
    )
}

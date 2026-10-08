import {
  OpenButton,
  TicketNumber,
  TicketStatus,
  TicketSubject,
  SubmittedDate
} from './components';
import styles from './ticketCard.module.css';
import classNames from 'classnames';

export const TicketCard = ({ ticket, onOpen, className }: { ticket: any, onOpen: () => void, className?: string }) => {
  return (
    <div className={classNames("ticketCard", styles.ticketCard, className)} tabIndex={0} data-design-element="ticketCard" data-design-id={`ticket-card-${ticket.id}`}>
      <div className={classNames("ticketCardLeft", styles.ticketCardLeft)}>
        <TicketNumber number={ticket.ticketId} />
        <TicketSubject subject={ticket.subject} />
        <TicketStatus status={ticket.status} />
      </div>
      <div className={classNames("ticketCardRight", styles.ticketCardRight)}>
        <SubmittedDate date={ticket.submittedDate} />
        <OpenButton onClick={onOpen} />
      </div>
    </div >
  )
}

import classNames from 'classnames';
import styles from './provider.module.css';

export const TicketCardListProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className={classNames("ticketCardListProvider", styles.ticketCardListProvider)}>
            {children}
        </div>
    )
}
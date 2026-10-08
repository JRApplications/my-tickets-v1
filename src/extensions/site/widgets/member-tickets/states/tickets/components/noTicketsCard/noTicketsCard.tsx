import React from 'react';
import classNames from 'classnames';
import styles from './noTicketsCard.module.css';

export const NoTicketsCard: React.FC<{ onCreateTicket: () => void }> = ({ onCreateTicket }) => {
    return (
        <div className={classNames("emptyState", styles.emptyState)}>
            <div className={classNames("emptyIcon", styles.emptyIcon)}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12h6M9 16h6M9 8h1" strokeLinecap="round" />
                    <path d="M4 6a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" strokeLinejoin="round" />
                    <path d="M15 4v4a1 1 0 0 0 1 1h4" strokeLinejoin="round" />
                </svg>
            </div>
            <p className={classNames("emptyTitle", styles.emptyTitle)}>No tickets found</p>
            <p className={classNames("emptySubtitle", styles.emptySubtitle)}>Try creating a new ticket to get started.</p>
            <button className={classNames("emptyBtn", styles.emptyBtn)} onClick={onCreateTicket}>Create Ticket</button>
        </div>
    )
}
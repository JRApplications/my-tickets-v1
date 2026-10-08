import styles from "./components.module.css";
import classNames from "classnames";

export const TicketStatus = ({ status }: { status: string }) => {
    return (
        <span className={classNames("ticketStatus", styles.ticketStatus)}>Status: <span className={classNames("value", styles.value)}>{status}</span></span>
    )
}
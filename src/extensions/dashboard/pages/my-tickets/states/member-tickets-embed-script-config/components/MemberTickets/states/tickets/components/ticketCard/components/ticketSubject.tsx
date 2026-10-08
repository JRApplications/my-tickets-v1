import classNames from "classnames"
import styles from "./components.module.css"

export const TicketSubject = ({ subject }: { subject: string }) => {
    return (
        <span className={classNames("ticketSubject", styles.ticketSubject)}>{subject}</span>
    )
}
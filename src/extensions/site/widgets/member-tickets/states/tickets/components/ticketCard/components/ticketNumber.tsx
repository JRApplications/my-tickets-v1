import classNames from "classnames"
import styles from "./components.module.css"

export const TicketNumber = ({ number }: { number: string }) => {
    return (
        <span className={classNames("ticketNumber", styles.ticketNumber)}>{number}</span>
    )
}


import classNames from "classnames"
import styles from "./components.module.css"

export const SubmittedDate = ({ date }: { date: string }) => {
    return (
        <span className={classNames("submittedOnDate", styles.submittedOnDate)}>Submitted On: {date}</span>
    )
}
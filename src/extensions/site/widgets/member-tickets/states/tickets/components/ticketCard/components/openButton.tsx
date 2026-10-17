import classNames from "classnames";
import styles from "./components.module.css";
import { ChevronRight } from '@wix/wix-ui-icons-common';

export const OpenButton = ({ onClick, ticketNumber }: { onClick: () => void; ticketNumber?: string }) => {
    return (
        <button
            type="button"
            className={classNames("openButton", styles.openButton)}
            onClick={onClick}
            aria-label={ticketNumber ? `Open ticket ${ticketNumber} details` : 'Open ticket details'}
        >
            <ChevronRight />
        </button>
    )
}

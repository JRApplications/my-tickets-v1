import classNames from "classnames";
import styles from "./components.module.css";
import { ChevronRight } from '@wix/wix-ui-icons-common';

export const OpenButton = ({ onClick }: { onClick: () => void }) => {
    return (
        <button className={classNames("openButton", styles.openButton)} onClick={onClick}>
            <ChevronRight />
        </button>
    )
}
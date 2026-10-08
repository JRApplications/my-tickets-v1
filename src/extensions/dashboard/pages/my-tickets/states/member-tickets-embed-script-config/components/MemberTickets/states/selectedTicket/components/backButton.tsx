import classNames from "classnames";
import styles from './components.module.css';
import { ChevronLeft } from '@wix/wix-ui-icons-common';

interface BackButtonProps {
    onClick?: () => void;
}

export const BackButton = ({ onClick }: BackButtonProps) => {
    return (
        <button className={classNames("backButton", styles.backButton)} data-design-element="backButton" data-design-id="back-button" onClick={onClick}>
            <ChevronLeft />
            Back
        </button>
    )
}

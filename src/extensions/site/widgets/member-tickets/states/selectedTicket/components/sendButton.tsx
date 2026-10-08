import classNames from "classnames";
import styles from './components.module.css';

interface SendButtonProps {
    onClick?: () => void;
}

export const SendButton = ({ onClick }: SendButtonProps) => {
    return (
        <button className={classNames("sendButton", styles.sendButton)} onClick={onClick}>Send</button>
    )
}

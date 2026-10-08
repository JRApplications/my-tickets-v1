import classNames from "classnames";
import styles from './components.module.css';

interface SendButtonProps {
    onClick?: () => void;
}

export const SendButton = ({ onClick }: SendButtonProps) => {
    return (
        <button className={classNames("sendButton", styles.sendButton)} data-design-element="sendButton" data-design-id="send-button" onClick={onClick}>Send</button>
    )
}

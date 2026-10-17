import classNames from "classnames";
import styles from './components.module.css';

interface SendButtonProps {
    onClick?: () => void;
    disabled?: boolean;
    isSending?: boolean;
}

export const SendButton = ({ onClick, disabled = false, isSending = false }: SendButtonProps) => (
    <button
        type="button"
        className={classNames("sendButton", styles.sendButton)}
        onClick={onClick}
        disabled={disabled}
    >
        {isSending ? 'Sending…' : 'Send'}
    </button>
)

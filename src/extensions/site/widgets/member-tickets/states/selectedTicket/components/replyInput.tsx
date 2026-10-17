import classNames from "classnames"
import styles from './components.module.css'

interface ReplyInputProps {
    onChange?: (value: string) => void;
    value?: string;
    disabled?: boolean;
}

export const ReplyInput = ({ onChange, value, disabled = false }: ReplyInputProps) => {
    return (
        <textarea
            className={classNames("replyInput", styles.replyInput)}
            aria-label="Type your reply"
            placeholder="Type your reply here..."
            value={value}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
        />
    )
}

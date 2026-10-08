import classNames from "classnames"
import styles from './components.module.css'

interface ReplyInputProps {
    onChange?: (value: string) => void;
    value?: string;
}

export const ReplyInput = ({ onChange, value }: ReplyInputProps) => {
    return (
        <textarea
            data-design-element="replyInput"
            data-design-id="reply-input"
            className={classNames("replyInput", styles.replyInput)}
            placeholder="Type your reply here..."
            value={value}
            readOnly
            aria-readonly="true"
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onChange={(e) => onChange?.(e.target.value)}
        />
    )
}

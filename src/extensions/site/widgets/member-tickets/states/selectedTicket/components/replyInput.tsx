import classNames from "classnames"
import styles from './components.module.css'

interface ReplyInputProps {
    onChange?: (value: string) => void;
    value?: string;
}

export const ReplyInput = ({ onChange, value }: ReplyInputProps) => {
    return (
        <textarea
            className={classNames("replyInput", styles.replyInput)}
            placeholder="Type your reply here..."
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
        />
    )
}
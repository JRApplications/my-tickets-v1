import { Avatar } from '@wix/design-system';
import classNames from 'classnames';
import styles from './messages.module.css';

export const AgentMessage = ({ message, style, senderName }: { message: string, style?: any, senderName: string }) => {
    return (
        <div className={classNames('__MessagePrimaryContainer', styles.__MessagePrimaryContainer)}>
            <div className={classNames('__MessagePrimaryHeader', styles.__MessagePrimaryHeader)}>
                {style?.MessageContainer?.AgentMessage?.Avatar?.visible === true && <Avatar size="size24" />}
                <p className={classNames('__AgentName', styles.__AgentName)}>{senderName}</p>
            </div>
            <div className={classNames('__MessagePrimary', styles.__MessagePrimary)}>
                <p>{message}</p>
            </div>
        </div>
    )
};
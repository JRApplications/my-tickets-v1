import { Avatar } from '@wix/design-system';
import classNames from 'classnames';
import styles from './messages.module.css';

export const AgentMessage = ({ message, style, senderName, designId }: { message: string, style?: any, senderName: string, designId: string }) => {
    return (
        <div className={classNames('__MessagePrimaryContainer', styles.__MessagePrimaryContainer)}>
            <div className={classNames('__MessagePrimaryHeader', styles.__MessagePrimaryHeader)}>
                {style?.MessageContainer?.AgentMessage?.Avatar?.visible === true && <Avatar size="size24" />}
                <p className={classNames('__AgentName', styles.__AgentName)} data-design-element="agentName" data-design-id={`${designId}-name`}>{senderName}</p>
            </div>
            <div className={classNames('__MessagePrimary', styles.__MessagePrimary)} data-design-element="agentBubble" data-design-id={`${designId}-bubble`}>
                <p>{message}</p>
            </div>
        </div>
    )
};

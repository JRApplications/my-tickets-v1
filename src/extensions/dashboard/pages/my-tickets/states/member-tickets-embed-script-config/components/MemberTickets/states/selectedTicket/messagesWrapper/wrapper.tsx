import { AgentMessage } from './agentMessage';
import { MemberMessage } from './memberMessage';
import styles from './messages.module.css';
import classNames from 'classnames';
export const MessagesWrapper = ({ messages, style }: { messages: any[], style?: any }) => {
    return (
        <div className={classNames("__MessageContainer", styles.__MessageContainer)}>
            {messages.map((message, index) => {
                if (message.senderType === 'agent') {
                    return <AgentMessage key={index} designId={`agent-${index}`} message={message.message} senderName={message.senderName} style={style} />;
                } else {
                    return <MemberMessage key={index} designId={`member-${index}`} message={message.message} />;
                }
            })}
        </div>
    )
}

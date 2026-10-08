import { useRef, useEffect, type FC, useState } from 'react';
import { Avatar, Badge, Box, Text, Tooltip, CounterBadge, BounceAnimation } from '@wix/design-system';
import './message.css';
import Attachment from './../attachment/attachment.route';

interface MessageWrapperProps {
    messages?: any[];
    internalNoteMode?: boolean;
    agentId?: string;
    isSiteUserTyping?: boolean;
}

const AGENT_MESSAGE_GAP = '10px';
const AGENT_MESSAGE_INNER_GAP = '4px';

const ONE_MINUTE_MS = 60_000;
const ONE_DAY_MS = 86_400_000;
const DAYS_IN_WEEK = 7;

const formatTimestamp = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();

    if (now.getTime() - date.getTime() < ONE_MINUTE_MS) return 'Just now';

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((startOfToday.getTime() - startOfDay.getTime()) / ONE_DAY_MS);

    if (diffDays === 0) return `Today at ${time}`;
    if (diffDays === 1) return `Yesterday at ${time}`;
    if (diffDays < DAYS_IN_WEEK && date.getDay() < now.getDay())
        return `${date.toLocaleDateString([], { weekday: 'short' })} at ${time}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${time}`;
};

const MessageWrapper: FC<MessageWrapperProps> = ({ messages = [], internalNoteMode, agentId, isSiteUserTyping }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (wrapperRef.current) {
            wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight;
        }
    }, [messages]);

    const TypingIndicator = () => {
        const [activeIndex, setActiveIndex] = useState(0);

        useEffect(() => {
            const interval = setInterval(() => {
                setActiveIndex((prev: any) => (prev + 1) % 3);
            }, 750); // adjust speed as needed

            return () => clearInterval(interval);
        }, []);

        return (
            <Box align="right" gap={2} verticalAlign="middle" height='max-content'>
                {[0, 1, 2].map((index) => (
                    <BounceAnimation
                        onEnd={() => setActiveIndex(activeIndex)}
                        active={activeIndex === index}
                    >
                        <CounterBadge
                            key={index}
                            skin="success"
                            size="tiny"
                            type={activeIndex === index ? 'solid' : 'outlined'}
                        />
                    </BounceAnimation>
                ))}
                <Text size="medium">Typing...</Text>
            </Box>
        );
    };

    return (
        <div className="messages-wrapper" ref={wrapperRef}>
            {messages.map(({ _id, message, attachment, timestamp, senderType, senderName, senderId }: any, index: any) => (
                <div key={_id || index} className={`message-item ${senderType}`}>
                    {internalNoteMode
                        ? (senderId === agentId
                            ? <AgentMessageWrapper message={message} attachments={attachment} timestamp={timestamp} agentName={senderName} />
                            : <UserMessageWrapper message={message} attachments={attachment} timestamp={timestamp} senderName={senderName} internalNoteMode={internalNoteMode} />)
                        : (senderType === 'agent'
                            ? <AgentMessageWrapper message={message} attachments={attachment} timestamp={timestamp} agentName={senderName} />
                            : senderType === 'user' || senderType === 'member' || senderType === 'visitor'
                                ? <UserMessageWrapper message={message} attachments={attachment} timestamp={timestamp} senderName={senderName} />
                                : <SystemMessageWrapper message={message} timestamp={timestamp} />)
                    }

                </div>
            ))}
            {isSiteUserTyping && <TypingIndicator />}
        </div>
    )
}

const GetSystemMessage: FC<{ type: string | undefined }> = ({ type }) => {
    switch (type) {
        case 'AGENT_JOINED':
            return <div className='system-message-message'>An agent has joined the chat.</div>;
        case 'AGENT_LEFT':
            return <div className='system-message-message'>An agent has left the chat.</div>;
        case 'USER_JOINED':
            return <div className='system-message-message'>A user has joined the chat.</div>;
        case 'USER_LEFT':
            return <div className='system-message-message'>A user has left the chat.</div>;
        case 'CHAT_ENDED':
            return <div className='system-message-message'>The chat has ended.</div>;
        case 'CHAT_REOPENED':
            return <div className='system-message-message'>The chat has been reopened.</div>;
        case 'CHAT_TRANSFERRED':
            return <div className='system-message-message'>The chat has been transferred to another agent.</div>;
        case 'CHAT_CONVERTED_TO_TICKET':
            return <div className='system-message-message'>The chat has been converted to a ticket.</div>;
        case 'WAITING_FOR_AGENT':
            return <div className='system-message-message'>Waiting for an agent to join the chat...</div>;
        default:
            return <div className='system-message-message'>System message</div>;
    }
}

const SystemMessageWrapper: FC<{ message: string | undefined; timestamp?: number }> = ({ message }) => {
    return (
        <div className="system-message-wrapper">
            <div className="system-message">
                <hr className="dashed" />
                <GetSystemMessage type={message} />
                <hr className="dashed" />
            </div>
        </div>
    )
}

const formatAgentMessage = (message: string | undefined) => {
    // some messages have inline mentions so for inline mentions we highlight them in blue
    if (!message) return '';

    const tokenRegex = /\[@({[^}]+})\]/g;
    const parts = message.split(tokenRegex);

    return parts.map((part, index) => {
        if (!part) return null;

        try {
            const mentionData = JSON.parse(part);
            return (
                <Tooltip key={`mention-${index}`} size="medium" appendTo="window" content={`Team: ${mentionData.teamName}`} className='mention-tooltip'>
                    <span style={{ color: '#0066cc', fontWeight: 'bold' }}>{mentionData.name}</span>
                </Tooltip>
            );
        } catch {
            return part;
        }
    }).filter(Boolean);
}

const AgentMessageWrapper: FC<{ message?: string; attachments?: Array<{ id: string; name: string; url: string }>; timestamp?: number; agentName?: string }> = ({ message, attachments, timestamp, agentName }) => {
    return (
        <div style={{ display: 'flex', gap: AGENT_MESSAGE_GAP }}>
            <Box gap={4} width='max-content' maxWidth='85%'>
                {agentName && <Avatar size={'size48'} name={agentName} />}
                <Box direction={'vertical'} gap={1} className='agent-message-content-new'>
                    {agentName && (
                        <Box gap={2} verticalAlign='middle'>
                            <Text size={'medium'} weight='bold' className='agent-name'>{agentName}</Text>
                            <Badge size="small" skin="success" uppercase={true} type="outlined">AGENT</Badge>
                        </Box>
                    )}
                    <Box direction={'vertical'} gap={2}>
                        {message && <Text>{formatAgentMessage(message)}</Text>}
                        <Box align='left' direction='vertical' gap={1}>
                            {attachments && <Attachment items={attachments} />}
                        </Box>
                    </Box>
                    <Box align='right' marginLeft='15px'>
                        <Text size={'tiny'}>{formatTimestamp(timestamp)}</Text>
                    </Box>
                </Box>
            </Box>
        </div>
    )
}

const UserMessageWrapper: FC<{ message?: string; attachments?: Array<{ id: string; name: string; url: string }>; timestamp?: number; senderName?: string, internalNoteMode?: boolean }> = ({ message, attachments, timestamp, senderName, internalNoteMode }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: AGENT_MESSAGE_INNER_GAP }}>
            <Box gap={4} width='max-content' maxWidth='85%'>
                <Box direction={'vertical'} gap={1} className='user-message-content-new'>
                    <Box gap={2} verticalAlign='middle' align='left'>
                        <Text size={'medium'} weight='bold' className='user-name'>{senderName}</Text>
                        {internalNoteMode && <Badge size="small" skin="standard" uppercase={true} type="outlined">AGENT</Badge>}
                    </Box>
                    <Box>
                        {message && <Text>{message}</Text>}
                        {attachments && <Attachment items={attachments} />}
                    </Box>
                    <Box align='right'>
                        <Text size={'tiny'}>{formatTimestamp(timestamp)}</Text>
                    </Box>
                </Box>
                {internalNoteMode && <Avatar size={'size48'} name={senderName} />}
            </Box>
        </div>
    )
}

export default MessageWrapper;

import { useRef, useEffect, type FC } from 'react';
import { Avatar, Box, Text, Divider, Tooltip, Card } from '@wix/design-system';
import Attachment from './attachment/attachment.route';
import { formatTimestamp } from '../formatTimestamp';
// import type { MessagesWrapperProps, MessageProps } from '@jrapps/my_tickets_common_types';

interface AttachmentProps {
    id: string;
    name: string;
    url: string;
}

interface InternalChatMessageProps {
    _id?: string;
    mailId?: string;
    senderId?: string;
    message?: string;
    messageType?: 'TEXT' | 'ATTACHMENT';
    attachments?: AttachmentProps[];
    senderName?: string;
    senderEmail?: string;
    timestamp: number;
    teamId?: string;
}

interface InternalChatMessagesWrapperProps {
    messages: InternalChatMessageProps[];
    agentId: string;
}

const MessageWrapper: FC<InternalChatMessagesWrapperProps> = ({ messages = [], agentId }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (wrapperRef.current) {
            wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight;
        }
    }, [messages]);

    const formatMention = (message: string | undefined) => {
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
    };

    return (
        <div className="messages-wrapper" ref={wrapperRef}>
            {[...messages].sort((a, b) => b?.timestamp - a?.timestamp).map(({ _id, message, attachments, timestamp, senderName, senderId }: InternalChatMessageProps, index) => (
                <div key={_id || index} className={`message-item ${senderId === agentId ? 'primary' : 'secondary'}`}>
                    {index === 0 ? (
                        <PrimaryMessageWrapper message={formatMention(message)} attachments={attachments} />
                    ) : (
                        <SecondaryMessageWrapper message={formatMention(message)} attachments={attachments} timestamp={timestamp || 'Error getting time stamp'} senderName={senderName} />
                    )}
                </div>
            ))}
        </div>
    )
}

const PrimaryMessageWrapper: FC<{ message?: string | React.ReactNode; attachments?: AttachmentProps[]; timestamp?: number; }> = ({ message, attachments }) => {
    return (
        <Box direction={'vertical'} boxSizing={'border-box'} width={'100%'} height={'max-content'}>
            {message && (
                <Card>
                    <Card.Content>
                        <Text>
                            {message}
                        </Text>
                    </Card.Content>
                </Card>

            )}
            {attachments && attachments.length > 0 && (
                <>
                    <Divider />
                    <Card>
                        <Card.Content>
                            {attachments.map((attachment) => <Attachment key={attachment.id} item={attachment} />)}
                        </Card.Content>
                    </Card>
                </>
            )}
        </Box>
    )
}

const SecondaryMessageWrapper: FC<{ message?: string | React.ReactNode; attachments?: AttachmentProps[]; timestamp: number | string; senderName: string | undefined }> = ({ message, attachments, timestamp, senderName }) => {
    return (
        <Box gap={2} direction={'vertical'} borderWidth={'1px'} boxSizing={'border-box'} borderStyle={'solid'} borderRadius={'8px'} boxShadow='0 1px 3px rgba(0, 0, 0, 0.1)' backgroundColor={'white'} width={'100%'} height={'max-content'}>
            <Box direction={'horizontal'} padding={'15px'} width={'100%'} boxSizing={'border-box'}>
                <Box><Avatar name={senderName} /></Box>
                <Box direction={'vertical'} gap={1} paddingLeft={'5px'} flexGrow={1}>
                    <Text weight={'bold'}>{senderName}</Text>
                    {message && <Text>{message}</Text>}
                </Box>
                <Box align={'right'}>
                    {timestamp && <Text size="small" secondary>{formatTimestamp(timestamp)}</Text>}
                </Box>
            </Box>
            {attachments && attachments.length > 0 && (
                <>
                    <Divider />
                    <Box padding={'15px'} gap={2}>
                        {attachments.map((attachment) => <Attachment key={attachment.id} item={attachment} />)}
                    </Box>
                </>
            )}
        </Box>
    )
}

export default MessageWrapper;

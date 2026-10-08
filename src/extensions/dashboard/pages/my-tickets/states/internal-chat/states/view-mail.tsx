import { Avatar, Box, Heading, IconButton, Text, Card, SkeletonRectangle, SkeletonCircle, SkeletonLine } from '@wix/design-system';
import { FlagFilled } from '@wix/wix-ui-icons-common';
import { Delete, Flag } from '@wix/wix-ui-icons-common/odeditor';
import { useState, useEffect, useCallback, useRef } from 'react';
import MessageInput from '../../../common-components/message-input/message-input.route';
import MessageWrapper from '../message-wrapper/message.wrapper';
import { myTicketsFetchWithAuth } from '../../../auth/myTicketsFetchWithAuth';
import { formatTimestamp } from '../formatTimestamp';
import './view-mail.css';

interface ViewMailProps {
    handleDeleteMail: (mailId: string) => Promise<void>;
    internalChatClassName: string;
    isSendingMessage: boolean;
    handleSendMessage: ({ message, attachments, mailId, agentId }: { message: string; attachments: any[]; mailId: string | null; agentId: string }) => Promise<{ success: boolean; updatedConversation?: any }>;
    agentId: string;
    selectedItemId: string | null;
    isFlagged: boolean;
    onFlaggedClicked: (args: { isRemoving: boolean; isAdding: boolean; agentId: string; mailId: string }) => void;
}

const ViewMail = ({
    internalChatClassName,
    handleSendMessage,
    agentId,
    selectedItemId,
    isFlagged,
    onFlaggedClicked,
    handleDeleteMail,
}: ViewMailProps) => {
    const [messageInput, setMessageInput] = useState<string>('');
    const [messageAttachments, setMessageAttachments] = useState<Array<{ id: string; name: string; url: string }>>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [failedSend, setFailedSend] = useState<{
        message: string;
        attachments: Array<{ id: string; name: string; url: string }>;
        mailId: string | null;
        agentId: string;
    } | null>(null);
    const [item, setItem] = useState<any>(null);
    const mailRequestId = useRef(0);

    useEffect(() => {
        setMessageInput('');
        setMessageAttachments([]);
    }, [selectedItemId]);

    const handleSend = useCallback(async (retryPayload?: {
        message: string;
        attachments: Array<{ id: string; name: string; url: string }>;
        mailId: string | null;
        agentId: string;
    }) => {
        const payload = retryPayload ?? failedSend ?? {
            message: messageInput,
            attachments: messageAttachments,
            mailId: selectedItemId,
            agentId,
        };
        if (isSending || (!payload.message.trim() && payload.attachments.length === 0)) return;
        setIsSending(true);
        try {
            const result = await handleSendMessage(payload);
            setFailedSend(result.success ? null : payload);
            if (result.success) {
                // Use the server's returned conversation if available, otherwise
                // append optimistically so the message appears immediately.
                if (selectedItemId === payload.mailId) {
                    if (result.updatedConversation?.messages) {
                        setItem(result.updatedConversation);
                    } else {
                        setItem((prev: any) => ({
                            ...prev,
                            messages: [
                                ...(prev?.messages ?? []),
                                {
                                    _id: crypto.randomUUID(),
                                    senderId: payload.agentId,
                                    message: payload.message,
                                    attachments: payload.attachments,
                                    timestamp: Date.now(),
                                },
                            ],
                        }));
                    }
                    if (payload.message === messageInput && payload.attachments === messageAttachments) {
                        setMessageInput('');
                        setMessageAttachments([]);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to send inbox reply:', error);
            setFailedSend(payload);
        } finally {
            setIsSending(false);
        }
    }, [messageInput, messageAttachments, selectedItemId, agentId, handleSendMessage, isSending, failedSend]);

    const handleMessageInputChange = (value: string) => {
        setMessageInput(value);
        setFailedSend(null);
    };

    const handleAttachmentsChange: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; url: string }>>> = (value) => {
        setMessageAttachments(value);
        setFailedSend(null);
    };

    const fetchMailDetails = useCallback(async () => {
        const requestId = ++mailRequestId.current;
        if (!selectedItemId) return;
        setIsLoading(true);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/internal-mail/getMail?mailId=${selectedItemId}&agentId=${agentId}`);
            if (!response.ok) {
                throw new Error(`Error fetching mail: ${response.statusText}`);
            }
            const data = await response.json();
            if (requestId === mailRequestId.current) {
                setItem(data.mail);
            }
        } catch (error) {
            if (requestId === mailRequestId.current) {
                console.error('Error fetching mail:', error);
            }
        } finally {
            if (requestId === mailRequestId.current) {
                setIsLoading(false);
            }
        }
    }, [selectedItemId, agentId]);

    useEffect(() => {
        fetchMailDetails();
    }, [fetchMailDetails]);



    if (isLoading) {
        return (
            <Box gap={3} className={`${internalChatClassName}-content-messages`} padding={'20px'} width={'100%'} height={'100%'} direction={'vertical'} boxSizing={'border-box'}>
                <Box direction={'vertical'} width={'100%'} gap={5}>
                    <Box WebkitJustifyContent={'space-between'} align={'center'} >
                        <Box>
                            <SkeletonRectangle width="200px" height="35px" />
                        </Box>
                        <Box gap={2}>
                            <SkeletonRectangle width="45px" height="45px" />
                            <SkeletonRectangle width="45px" height="45px" />
                        </Box>
                    </Box>
                    <Box gap={2}>
                        <SkeletonCircle diameter="50px" />
                        <Box direction={'vertical'} gap={1.5}>
                            <Box direction={'vertical'} gap={1}>
                                <SkeletonLine width="150px" />
                                <SkeletonLine width="250px" />
                            </Box>
                            <Box>
                                <SkeletonLine width="100px" />
                            </Box>
                        </Box>
                    </Box>
                </Box>
                <Box direction={'vertical'} gap={5} height={'100%'} flexGrow={1} overflow={'auto'} boxSizing={'border-box'}>
                    <SkeletonRectangle width="100%" height="60px" />
                    <SkeletonRectangle width="50%" height="60px" />
                    <SkeletonRectangle width="70%" height="60px" />
                    <SkeletonRectangle width="50%" height="60px" />
                    <SkeletonRectangle width="80%" height="60px" />
                </Box>
                <Card>
                    <Card.Content dataHook="internal-mail-message-input-card">
                        <MessageInput
                            messageInput={messageInput}
                            setMessageInput={setMessageInput}
                            handleSendMessage={handleSend}
                            isSending={isSending}
                            ticketPermissions={['my-tickets-single-ticket-send-message']}
                            attachments={messageAttachments}
                            setAttachments={setMessageAttachments}
                            placeholder="Start typing your message... Type @ to mention someone"
                            allowMentions={true}
                            getMentionApiUrl="/api/agents/getMentionList"
                            isLoading={true}

                        />
                    </Card.Content>
                </Card>
            </Box>
        );
    }

    return (
        <Box gap={3} className={`${internalChatClassName}-content-messages`} padding={'20px'} width={'100%'} height={'100%'} direction={'vertical'} boxSizing={'border-box'}>
            <Box direction={'vertical'} width={'100%'} gap={5}>
                <Box WebkitJustifyContent={'space-between'} align={'center'} >
                    <Box>
                        <Heading>{item?.metaData.subject}</Heading>
                    </Box>
                    <Box gap={2}>
                        <IconButton
                            size="large"
                            className={isFlagged ? 'internal-chat-flag-button-flagged' : 'internal-chat-flag-button'}
                            priority={isFlagged ? 'primary' : 'secondary'}
                            onClick={() => {
                                if (selectedItemId) {
                                    onFlaggedClicked({
                                        isRemoving: isFlagged,
                                        isAdding: !isFlagged,
                                        agentId,
                                        mailId: selectedItemId,
                                    });
                                }
                            }}
                        >
                            {isFlagged ? <FlagFilled color='white' /> : <Flag />}
                        </IconButton>

                        <IconButton
                            size="large"
                            priority="secondary"
                            skin="destructive"
                            onClick={() => {
                                if (selectedItemId) {
                                    handleDeleteMail(selectedItemId);
                                }
                            }}
                        >
                            <Delete />
                        </IconButton>
                    </Box>
                </Box>
                <Box gap={2}>
                    <Avatar shape="circle" name={item?.metaData.agentFrom.name ?? ''} />
                    <Box direction={'vertical'} gap={1.5}>
                        <Box direction={'vertical'} gap={1}>
                            <Text size={'medium'} weight={'bold'}>{item?.metaData.agentFrom.name}</Text>
                            <Text size="small" secondary>{item?.metaData.agentFrom.email}</Text>
                        </Box>
                        <Box>
                            <Text skin='primary' size="small" color={'#e7e6e6'} secondary>{formatTimestamp(item?.metaData?.agentFrom?.timestamp)}</Text>
                        </Box>
                    </Box>
                </Box>
            </Box>
            <Box direction={'vertical'} gap={2} height={'100%'} flexGrow={1} overflow={'auto'} boxSizing={'border-box'}>
                <MessageWrapper
                    messages={item?.messages || []}
                    agentId={agentId}
                />
            </Box>
            <Card>
                <Card.Content dataHook="internal-mail-message-input-card">
                    <MessageInput
                        messageInput={messageInput}
                        setMessageInput={handleMessageInputChange}
                        handleSendMessage={handleSend}
                        isSending={isSending}
                        hasFailedSend={Boolean(failedSend)}
                        ticketPermissions={['my-tickets-single-ticket-send-message']}
                        attachments={messageAttachments}
                        setAttachments={handleAttachmentsChange}
                        placeholder="Start typing your message... Type @ to mention someone"
                        allowMentions={true}
                        getMentionApiUrl="/api/agents/getMentionList"

                    />
                </Card.Content>
            </Card>
        </Box>
    )
}

export default ViewMail;

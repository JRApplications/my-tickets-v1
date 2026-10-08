import { useState, type FC } from 'react';
import {
    Box,
    Card,
    Text,
    SkeletonRectangle
} from '@wix/design-system';

import MessageWrapper from '../../common-components/message-wrapper/message.wrapper';
import ChatHeader from './chat-header';
import './view-chat.css';
import MessageInput from '../../common-components/message-input/message-input.route';
import { LoadingState } from '@jrapps/my_tickets_dashboard_ui';

import type { ViewChatWrapperProps } from './chats.types';

const ViewChatWrapper: FC<ViewChatWrapperProps> = ({
    chatPermissions,
    isLoading,
    isError,
    agentId,
    memberId,
    onViewMemberClicked,
    messages,
    onSendMessage,
    connectionStatus,
    isSiteUserTyping,
    onJoinChat,
    onLeaveChat,
    conversationId,
    currentAgentJoined,
    isJoining,
    isLeaving,
    isEnding,
    onEndChat,
    chatEnded,
    userName,
    userType,
    onConvertToTicket,
    onTransferChat,
}) => {
    const [messageInput, setMessageInput] = useState('');
    const [attachments, setAttachments] = useState<Array<{ id: string; name: string; url: string }>>([]);
    const [isSending, setIsSending] = useState(false);

    // if (!chatPermissions.includes('my-tickets-view-single-ticket')) {
    //     return (
    //         <PermissionDeniedState />
    //     );
    // }

    if (!conversationId || !agentId) {
        return (
            <Box direction="vertical" width='100%'>
                <Box className='view-ticket-empty-state'>
                    <Text className='text'>Select a chat to start assisting</Text>
                </Box>
            </Box>
        );
    }

    if (isError) {
        return (
            <Box direction={'vertical'} height={'100%'} width={'100%'}>
                <LoadingState
                    state={'error'}
                    errorText='Failed to load chat. Please try again later.'
                />
            </Box>
        );
    }

    const handleSendMessage = async () => {
        setIsSending(true);
        try {
            const wasSent = await onSendMessage(messageInput, attachments);
            if (wasSent) {
                setMessageInput('');
                setAttachments([]);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Box direction="vertical" width='100%'>
            <ChatHeader
                memberName={userName || ''}
                memberId={memberId}
                onViewMember={(id) => onViewMemberClicked?.(id)}
                joinedChat={currentAgentJoined}
                isJoining={isJoining}
                isLeaving={isLeaving}
                isEnding={isEnding}
                connectionStatus={connectionStatus}
                onJoinChat={onJoinChat}
                onLeaveChat={onLeaveChat}
                onEndChat={onEndChat}
                chatEnded={chatEnded}
                isLoading={isLoading}
                userType={userType}
                onConvertToTicket={onConvertToTicket}
                onTransferChat={onTransferChat}
            />
            <Box direction='horizontal' className='view-ticket-outer-body-container'>
                <Box direction='vertical' className='inner-box-one'>
                    <Card className='view-ticket-card' stretchVertically hideOverflow>
                        <Card.Content dataHook="view-ticket-card-content">
                            <Box className='view-ticket-body'>
                                {!isLoading && (
                                    <Box className='view-ticket-inner-body-container'>
                                        <MessageWrapper messages={messages} internalNoteMode={false} agentId={agentId} isSiteUserTyping={isSiteUserTyping} />
                                    </Box>
                                )}

                                {isLoading && (
                                    <Box className='view-ticket-inner-body-container' gap='18px' direction='vertical'>
                                        <Box align='left'>
                                            <SkeletonRectangle width="450px" height="35px" />
                                        </Box>
                                        <Box align='right'>
                                            <SkeletonRectangle width="300px" height="35px" />
                                        </Box>
                                        <Box align='left'>
                                            <SkeletonRectangle width="500px" height="35px" />
                                        </Box>
                                        <Box align='right'>
                                            <SkeletonRectangle width="450px" height="35px" />
                                        </Box>
                                        <Box align='left'>
                                            <SkeletonRectangle width="400px" height="35px" />
                                        </Box>
                                        <Box align='right'>
                                            <SkeletonRectangle width="350px" height="35px" />
                                        </Box>
                                        <Box align='left'>
                                            <SkeletonRectangle width="300px" height="35px" />
                                        </Box>
                                        <Box align='right'>
                                            <SkeletonRectangle width="250px" height="35px" />
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Card.Content>
                        {currentAgentJoined && (
                            <Box className='view-ticket-footer'>
                                <Box className='view-ticket-inner-footer-container' padding='18px' paddingTop='0px'>
                                    <MessageInput
                                        messageInput={messageInput}
                                        setMessageInput={setMessageInput}
                                        handleSendMessage={handleSendMessage}
                                        isSending={isSending}
                                        ticketPermissions={chatPermissions}
                                        attachments={attachments}
                                        setAttachments={setAttachments}
                                        placeholder={'Start typing your message...'}
                                        allowMentions={false}
                                        getMentionApiUrl="/api/agents/getMentionList"
                                        disabled={!currentAgentJoined || isSending}
                                        isLoading={isLoading}
                                    />
                                </Box>
                            </Box>
                        )}
                    </Card>
                </Box>
            </Box>
        </Box>
    )
}

export default ViewChatWrapper;

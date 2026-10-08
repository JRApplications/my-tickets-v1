import { useEffect, useState, type FC } from 'react';
import ViewChatWrapper from './view-chat.wrapper';
import type { ViewChatProps } from './chats.types';
import { useMessages } from './view-chat';
import { ChatTransferModal } from '../../Modals/ChatTransferModal';

const ViewChat: FC<ViewChatProps> = ({
    permissions,
    agentId,
    teamId,
    conversationId,
    onViewMemberClicked,
    onChatEnded,
    onConvertToTicket,
}) => {
    const [chatEnded, setChatEnded] = useState(false);
    const [chatTransferRequest, setChatTransferRequest] = useState<{ conversationId: string; teamId: string } | null>(null);
    useEffect(() => {
        setChatEnded(false);
    }, [conversationId]);
    const { messages, sendMessage, connectionStatus, isSiteUserTyping, joinChat, leaveChat, endChat, currentAgentJoined, isJoining, isLeaving, isEnding, userName, userType, memberId, isLoading, isError, onTransferChat } = useMessages(conversationId, agentId, teamId, {
        onChatEnded: () => {
            setChatEnded(true);
            onChatEnded?.();
        },
        onTransferChatRequested: setChatTransferRequest,
    });

    const handleTransferComplete = async () => {
        const didLeaveChat = !currentAgentJoined || await leaveChat();
        setChatTransferRequest(null);
        setChatEnded(true);
        onChatEnded?.();
        return didLeaveChat;
    };

    return (
        <>
            <ViewChatWrapper
                chatPermissions={permissions}
                isLoading={isLoading}
                isError={isError}
                agentId={agentId}
                memberId={memberId}
                onViewMemberClicked={onViewMemberClicked}
                onJoinChat={() => { joinChat() }}
                onLeaveChat={leaveChat}
                onEndChat={() => { endChat() }}
                messages={messages}
                onSendMessage={sendMessage}
                connectionStatus={connectionStatus}
                isSiteUserTyping={isSiteUserTyping}
                conversationId={conversationId}
                currentAgentJoined={currentAgentJoined}
                isJoining={isJoining}
                isLeaving={isLeaving}
                isEnding={isEnding}
                chatEnded={chatEnded}
                userName={userName || ''}
                userType={userType || ''}
                onConvertToTicket={() => onConvertToTicket?.(memberId, conversationId)}
                onTransferChat={onTransferChat}
            />
            <ChatTransferModal
                isOpen={chatTransferRequest !== null}
                currentTeamId={chatTransferRequest?.teamId || ''}
                conversationId={chatTransferRequest?.conversationId || ''}
                onClose={() => setChatTransferRequest(null)}
                onTransferComplete={handleTransferComplete}
            />
        </>
    );
}

export default ViewChat;

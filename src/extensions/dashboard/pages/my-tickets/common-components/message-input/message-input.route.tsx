import { type FC } from 'react';

import MessageInputWrapper from './message-input.wrapper';

import type { MessageInputProps } from './tickets.types';

const MessageInput: FC<MessageInputProps> = ({
    messageInput,
    setMessageInput,
    handleSendMessage,
    isSending,
    ticketPermissions,
    attachments,
    setAttachments,
    hideSendButton = false,
    isInternalMail = false,
    allowMentions = true,
    placeholder = '',
    getMentionApiUrl,
    disabled = false,
    isLoading = false,
    hasFailedSend = false,
}) => {
    return (
        <MessageInputWrapper
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            handleSendMessage={handleSendMessage}
            isSending={isSending}
            ticketPermissions={ticketPermissions}
            attachments={attachments}
            setAttachments={setAttachments}
            hideSendButton={hideSendButton}
            isInternalMail={isInternalMail}
            allowMentions={allowMentions}
            placeholder={placeholder}
            getMentionApiUrl={getMentionApiUrl}
            disabled={disabled}
            isLoading={isLoading}
            hasFailedSend={hasFailedSend}
        />
    );
}

export default MessageInput;

import React from 'react';
import type { MessageProps } from '../SiteChatComponentNew.types';
import UserMessage from './UserMessage';
import AgentMessage from './AgentMessage';
import SystemMessage from './SystemMessage';
import AttachmentMessage from './AttachmentMessage';

interface MessageRendererProps {
  message: MessageProps;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ message }) => {
  const hasAttachments = Array.isArray(message.attachment)
    ? message.attachment.length > 0
    : Boolean(message.attachment || message.item);
  if (message.messageType === 'ATTACHMENT' || hasAttachments) {
    return <AttachmentMessage message={message} />;
  }

  switch (message.senderType) {
    case 'user':
    case 'visitor':
    case 'member':
      return <UserMessage message={message} />;
    case 'agent':
      return <AgentMessage message={message} />;
    case 'system':
      return <SystemMessage message={message} />;
    default:
      return null;
  }
};

export default MessageRenderer;

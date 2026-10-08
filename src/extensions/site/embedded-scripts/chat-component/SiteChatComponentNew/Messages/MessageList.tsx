import React from 'react';
import type { MessageProps } from '../SiteChatComponentNew.types';
import { useAutoScroll } from '../hooks';
import MessageRenderer from './MessageRenderer';
import styles from './MessageList.module.css';
import classNames from 'classnames';

interface MessageListProps {
  messages: MessageProps[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const scrollRef = useAutoScroll<HTMLDivElement>(messages);

  return (
    <div
      ref={scrollRef}
      className={classNames("cw__message__list", styles.cw__message__list)}
      role="list"
      aria-label="Chat messages"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.map((msg, index) => (
        <MessageRenderer
          key={msg._id ?? `${msg.timestamp ?? index}-${index}`}
          message={msg}
        />
      ))}
      {/* TypingIndicator removed — no longer part of the public API */}
    </div>
  );
};

export default MessageList;

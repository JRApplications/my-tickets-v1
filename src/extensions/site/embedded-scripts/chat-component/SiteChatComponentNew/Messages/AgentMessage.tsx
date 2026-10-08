import React from 'react';
import type { MessageProps } from '../SiteChatComponentNew.types';
import { formatTime } from '../utils';
import styles from './AgentMessage.module.css';
import classNames from 'classnames';

interface AgentMessageProps {
  message: MessageProps;
}

const AgentMessage: React.FC<AgentMessageProps> = ({ message }) => {
  return (
    <div
      className={classNames("cw__agent__message", styles.cw__agent__message)}
      role="listitem"
      aria-label={`Message from ${message.senderName ?? 'Agent'}`}
    >
      {/* <Avatar name={message.senderName} size={32} /> */}
      <div className={classNames("cw__agent__message__content", styles.cw__agent__message__content)}>
        {message.senderName && (
          <span className={classNames("cw__agent__message__name", styles.cw__agent__message__name)}>{message.senderName}</span>
        )}
        <div className={classNames("cw__agent__message__bubble", styles.cw__agent__message__bubble)}>{message.message}</div>
        {message.timestamp !== undefined && (
          <span className={classNames("cw__agent__message__time", styles.cw__agent__message__time)}>
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
};

export default AgentMessage;

import classNames from 'classnames';
import React from 'react';
import type { MessageProps } from '../SiteChatComponentNew.types';
import { formatTime } from '../utils';
import styles from './UserMessage.module.css';

interface UserMessageProps {
  message: MessageProps;
}

const UserMessage: React.FC<UserMessageProps> = ({ message }) => {
  return (
    <div className={classNames("cw__user__message", styles.cw__user__message)} role="listitem" aria-label="Your message">
      <div className={classNames("cw__user__message__bubble", styles.cw__user__message__bubble)}>{message.message}</div>
      {message.timestamp !== undefined && (
        <span className={classNames("cw__user__message__time", styles.cw__user__message__time)}>
          {formatTime(message.timestamp)}
        </span>
      )}
    </div>
  );
};

export default UserMessage;

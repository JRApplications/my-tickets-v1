import classNames from 'classnames';
import React from 'react';
import type { MessageProps } from '../SiteChatComponentNew.types';
import { getSystemLabel } from '../utils';
import styles from './SystemMessage.module.css';

interface SystemMessageProps {
  message: MessageProps;
}

const SystemMessage: React.FC<SystemMessageProps> = ({ message }) => {
  const label = message.message
    ? getSystemLabel(message.message)
    : message.message ?? '';

  return (
    <div
      className={classNames("cw__system__message", styles.cw__system__message)}
      role="listitem"
      aria-label={`System notification: ${label}`}
    >
      <span className={classNames("cw__system__message__line", styles.cw__system__message__line)} aria-hidden="true" />
      <span className={classNames("cw__system__message__text", styles.cw__system__message__text)}>{label}</span>
      <span className={classNames("cw__system__message__line", styles.cw__system__message__line)} aria-hidden="true" />
    </div>
  );
};

export default SystemMessage;

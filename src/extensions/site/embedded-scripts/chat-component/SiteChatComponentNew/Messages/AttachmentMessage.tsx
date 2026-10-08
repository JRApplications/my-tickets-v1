import classNames from 'classnames';
import React from 'react';
import type { MessageProps } from '../SiteChatComponentNew.types';
import { formatTime } from '../utils';
import styles from './AttachmentMessage.module.css';

interface AttachmentMessageProps {
  message: MessageProps;
}

const AttachmentMessage: React.FC<AttachmentMessageProps> = ({ message }) => {
  // Support both `item` (new) and `attachment` (legacy) field names
  const attachment = message.item ?? message.attachment;
  if (!attachment) return null;

  const handleOpen = () => {
    window.open(attachment.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={classNames(
        `cw__attachment__message${message.senderType === 'user' ? ' cw__attachment__message__user' : ''}`, message.senderType === 'user' ? styles.cw__attachment__message__user : styles.cw__attachment__message
      )}
      role="listitem"
      aria-label={`Attachment: ${attachment.name}`}
    >
      <div className={classNames("cw__attachment__message__card", styles.cw__attachment__message__card)}>
        <div className={classNames("cw__attachment__message__icon", styles.cw__attachment__message__icon)} aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div className={classNames("cw__attachment__message__info", styles.cw__attachment__message__info)}>
          <span className={classNames("cw__attachment__message__name", styles.cw__attachment__message__name)}>{attachment.name}</span>
          <span className={classNames("cw__attachment__message__label", styles.cw__attachment__message__label)}>Attachment</span>
        </div>
        <button
          className={classNames("cw__attachment__message__open__btn", styles.cw__attachment__message__open__btn)}
          onClick={handleOpen}
          aria-label={`Open attachment ${attachment.name}`}
          type="button"
        >
          Open
        </button>
      </div>
      {message.timestamp !== undefined && (
        <span
          className={classNames(
            (message.senderType !== 'user' ? 'cw__attachment__message__time' : 'cw__attachment__message__time cw__attachment__message__time__right'),
            (message.senderType === 'user' ? (styles.cw__attachment__message__time__right, styles.cw__attachment__message__time) : styles.cw__attachment__message__time)
          )}
        >
          {formatTime(message.timestamp)}
        </span>
      )}
    </div>
  );
};

export default AttachmentMessage;

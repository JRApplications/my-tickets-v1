import classNames from 'classnames';
import React from 'react';
import type { HeaderProps } from '../SiteChatComponentNew.types';
import styles from './Header.module.css';

const Header: React.FC<HeaderProps> = ({ image, title, subtitle, onClose, onEndChat, endingChat, endChatError }) => {
  return (
    <header className={classNames("cw__header", styles.cw__header)} role="banner" data-element="cw__header" >
      <div className={classNames("cw__header__identity", styles.cw__header__identity)} data-element="cw__header__identity__container">
        {image && (
          <img
            src={image}
            alt={`${title} avatar`}
            className="cw-header__avatar"
          />
        )}
        <div className={classNames("cw__header__text", styles.cw__header__text)} data-element="cw__header__text__container">
          <span className={classNames("cw__header__title", styles.cw__header__title)} data-element="cw__header__title">{title}</span>
          {subtitle && (
            <span className={classNames("cw__header__subtitle", styles.cw__header__subtitle)} data-element="cw__header__subtitle">{subtitle}</span>
          )}
        </div>
      </div>
      <div className={classNames("cw__header__actions", styles.cw__header__actions)}>
        {endChatError && (
          <span className={classNames("cw__header__end__error", styles.cw__header__end__error)} role="alert">
            Could not end chat
          </span>
        )}
        {onEndChat && (
          <button
            className={classNames("cw__header__end", styles.cw__header__end)}
            onClick={onEndChat}
            type="button"
            disabled={endingChat}
          >
            {endingChat ? 'Ending…' : 'End chat'}
          </button>
        )}
        <button
          className={classNames("cw__header__close", styles.cw__header__close)}
          data-element="cw__header__closeButton"
          onClick={onClose}
          aria-label="Close chat"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;

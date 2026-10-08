import classNames from 'classnames';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FooterProps } from '../SiteChatComponentNew.types';
import styles from './Footer.module.css';

const TYPING_STOP_DELAY = 3000; // ms of inactivity before "stopped typing"

const Footer: React.FC<FooterProps> = ({ onSend, onAttachment, onTypingStarted, onTypingStopped, disabled }) => {
  const [text, setText] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const isEmpty = text.trim().length === 0 && stagedFiles.length === 0;
  const controlsDisabled = disabled;

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStopped?.();
    }
  }, [onTypingStopped]);

  const handleSend = useCallback(() => {
    if (!isEmpty && !controlsDisabled) {
      stopTyping();
      if (text.trim().length > 0) {
        onSend?.(text.trim());
        setText('');
      }
      stagedFiles.forEach((file) => onAttachment?.(file));
      setStagedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  }, [isEmpty, controlsDisabled, onSend, text, stagedFiles, onAttachment, stopTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setText(value);

      // Auto-grow textarea up to ~120px
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;

      // Typing indicator: started
      if (value.trim().length > 0 && !isTypingRef.current) {
        isTypingRef.current = true;
        onTypingStarted?.();
      } else if (value.trim().length === 0 && isTypingRef.current) {
        // Field cleared — treat as stopped immediately
        stopTyping();
        return;
      }

      // Typing indicator: debounced stop
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(stopTyping, TYPING_STOP_DELAY);
    },
    [onTypingStarted, stopTyping],
  );

  const handleBlur = useCallback(() => {
    stopTyping();
  }, [stopTyping]);

  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        setStagedFiles((prev) => [...prev, ...files]);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [],
  );

  const handleRemoveStagedFile = useCallback((index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Stop typing if the input becomes disabled mid-type (message sent, disconnect, etc.)
  useEffect(() => {
    if (controlsDisabled) stopTyping();
  }, [controlsDisabled, stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <footer className={classNames("cw__footer", styles.cw__footer)} role="contentinfo">
      {stagedFiles.length > 0 && (
        <ul className={classNames("cw__footer__file__list", styles.cw__footer__file__list)} aria-label="Files to send">
          {stagedFiles.map((file, i) => (
            <li key={`${file.name}-${i}`} className={classNames("cw__footer__file__chip", styles.cw__footer__file__chip)}>
              <span className={classNames("cw__footer__file__chip__name", styles.cw__footer__file__chip__name)} title={file.name}>
                {file.name}
              </span>
              <button
                className={classNames("cw__footer__file__chip__remove", styles.cw__footer__file__chip__remove)}
                onClick={() => handleRemoveStagedFile(i)}
                aria-label={`Remove ${file.name}`}
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={classNames("cw__footer__controls", styles.cw__footer__controls)}>
        <button
          className={classNames("cw__footer__attach__btn", styles.cw__footer__attach__btn)}
          onClick={handleAttachmentClick}
          aria-label="Attach file"
          type="button"
          disabled={controlsDisabled}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          className={classNames("cw__footer__input", styles.cw__footer__input)}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Type a message…"
          aria-label="Message input"
          rows={1}
          disabled={controlsDisabled}
        />

        <button
          className={classNames(`cw__footer__send__btn${isEmpty || controlsDisabled ? ' cw__footer__send__btn__disabled' : ''}`, styles.cw__footer__send__btn, (isEmpty || controlsDisabled ? styles.cw__footer__send__btn__disabled : ''))}
          onClick={handleSend}
          aria-label="Send message"
          type="button"
          disabled={isEmpty || controlsDisabled}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className={classNames("cw__footer__file__input", styles.cw__footer__file__input)}
          onChange={handleFileChange}
          aria-hidden="true"
          tabIndex={-1}
          multiple
        />
      </div>
    </footer>
  );
};

export default Footer;

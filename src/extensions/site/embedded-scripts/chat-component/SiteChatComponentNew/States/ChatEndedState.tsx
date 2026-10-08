import React from 'react';
import './ChatEndedState.css';

const ChatEndedState: React.FC = () => {
  return (
    <div
      className="cw-chat-ended-state"
      role="status"
      aria-label="Chat has ended"
    >
      <div className="cw-chat-ended-state__icon" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p className="cw-chat-ended-state__title">Chat Ended</p>
      <p className="cw-chat-ended-state__subtitle">
        Your chat session has ended. Thank you for reaching out!
      </p>
    </div>
  );
};

export default ChatEndedState;

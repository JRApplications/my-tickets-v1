import React from 'react';
import './TypingIndicator.css';

const TypingIndicator: React.FC = () => {
  return (
    <div
      className="cw-typing-indicator"
      role="status"
      aria-label="Agent is typing"
    >
      <div className="cw-typing-indicator__bubble">
        <span className="cw-typing-indicator__dot" />
        <span className="cw-typing-indicator__dot" />
        <span className="cw-typing-indicator__dot" />
      </div>
    </div>
  );
};

export default TypingIndicator;

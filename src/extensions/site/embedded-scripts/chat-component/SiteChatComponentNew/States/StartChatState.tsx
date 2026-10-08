import React from 'react';
import { Button } from '../Shared';
import './StartChatState.css';

interface StartChatStateProps {
  image?: string;
  title: string;
  description?: string;
  onStart: () => void;
}

const StartChatState: React.FC<StartChatStateProps> = ({
  image,
  title,
  description,
  onStart,
}) => {
  return (
    <div
      className="cw-start-chat-state"
      role="main"
      aria-label="Start a chat"
    >
      {image && (
        <img
          src={image}
          alt="Support illustration"
          className="cw-start-chat-state__image"
        />
      )}
      <h2 className="cw-start-chat-state__title">{title}</h2>
      {description && (
        <p className="cw-start-chat-state__description">{description}</p>
      )}
      <Button onClick={onStart} ariaLabel="Start chat">
        Start Chat
      </Button>
    </div>
  );
};

export default StartChatState;

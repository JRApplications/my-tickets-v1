import React from 'react';
import { Button } from '../Shared';
import { checkChatAvailable } from '../../api/checkChatAvailable';

interface StartChatStateProps {
  image?: string;
  title: string;
  description?: string;
  onStart: () => void;
  loading?: boolean;
  error?: string | null;
}

const StartChatState: React.FC<StartChatStateProps> = ({
  image,
  title,
  description,
  onStart,
  loading = false,
  error,
}) => {
  const [checking, setChecking] = React.useState(false);
  const [limitMessage, setLimitMessage] = React.useState<string | null>(null);

  // The monthly chat limit is checked on the click, before the visitor joins a conversation.
  const handleClick = async () => {
    if (checking) return;
    setChecking(true);
    setLimitMessage(null);
    try {
      await checkChatAvailable();
    } catch (limitError) {
      setLimitMessage(limitError instanceof Error ? limitError.message : 'Live chat is unavailable right now.');
      setChecking(false);
      return;
    }
    setChecking(false);
    onStart();
  };

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
      {(limitMessage || error) && <p role="alert">{limitMessage ?? error}</p>}
      <Button onClick={handleClick} ariaLabel="Start chat" disabled={loading || checking}>
        {loading || checking ? 'Starting…' : 'Start Chat'}
      </Button>
    </div>
  );
};

export default StartChatState;

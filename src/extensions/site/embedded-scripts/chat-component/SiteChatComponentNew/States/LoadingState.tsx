import React from 'react';
import './LoadingState.css';

const LoadingState: React.FC = () => {
  return (
    <div
      className="cw-loading-state"
      role="status"
      aria-label="Loading chat"
    >
      <div className="cw-loading-state__spinner" aria-hidden="true">
        <div className="cw-loading-state__spinner-ring" />
      </div>
      <p className="cw-loading-state__title">Loading…</p>
      <p className="cw-loading-state__subtitle">
        Please wait while your chat loads.
      </p>
    </div>
  );
};

export default LoadingState;

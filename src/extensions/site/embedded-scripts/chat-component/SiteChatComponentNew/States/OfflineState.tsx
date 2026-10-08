import React from 'react';
import OfflineForm from '../OfflineForm/OfflineForm';
import type { OfflineFormSchema } from '../SiteChatComponentNew.types';
import './OfflineState.css';

interface OfflineStateProps {
  form?: OfflineFormSchema;
  recaptchaSiteKey: string;
  onSubmit: (values: Record<string, unknown>, captchaToken: string) => Promise<void> | void;
}

const OfflineState: React.FC<OfflineStateProps> = ({ form, recaptchaSiteKey, onSubmit }) => {
  return (
    <div
      className="cw-offline-state"
      role="main"
      aria-label="Business is offline"
    >
      <div className="cw-offline-state__header">
        <div className="cw-offline-state__icon" aria-hidden="true">
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
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <h2 className="cw-offline-state__title">We're currently offline</h2>
        <p className="cw-offline-state__subtitle">
          Please leave us a message and we'll get back to you as soon as possible.
        </p>
      </div>

      {form && (
        <div className="cw-offline-state__form-wrapper">
          <OfflineForm schema={form} recaptchaSiteKey={recaptchaSiteKey} onSubmit={onSubmit} />
        </div>
      )}
    </div>
  );
};

export default OfflineState;

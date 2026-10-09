import React from 'react';
import { createRoot } from 'react-dom/client';
import { SiteChatComponentNew } from './SiteChatComponentNew';
import { myWixClient, injectAccessTokenFunction, wixRecaptchaVisibleSiteKey } from './wixClient';
export { injectAccessTokenFunction };


const configEl = document.getElementById('chat-embed-config');
if (!configEl) throw new Error('Chat Embed: config element not found');

const { enabled, demoData, themeB64, offlineFormB64 } = (configEl as HTMLElement).dataset;
if (enabled !== 'true') throw new Error('Chat Embed: disabled');

const decodeBase64Json = (value: string) => {
  const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

let parsedTheme: Record<string, unknown> | undefined;
if (themeB64) {
  try {
    parsedTheme = decodeBase64Json(themeB64);
  } catch {
    parsedTheme = undefined;
  }
}

const defaultOfflineForm: Record<string, unknown> = {
  title: 'Leave us a message',
  submitButtonText: 'Send Message',
  fields: [
    { id: 'name', type: 'text', label: 'Your Name', placeholder: 'Enter your name', required: true },
    { id: 'email', type: 'email', label: 'Email Address', placeholder: 'Enter your email', required: true },
    { id: 'message', type: 'textarea', label: 'Message', placeholder: 'Type your message here...', required: true },
  ],
};

let parsedOfflineForm: Record<string, unknown> | undefined = defaultOfflineForm;
if (offlineFormB64) {
  try {
    parsedOfflineForm = decodeBase64Json(offlineFormB64);
  } catch {
    parsedOfflineForm = defaultOfflineForm;
  }
}

const isDemoData = demoData === 'true';

function initChatEmbed() {

  const container = document.createElement('div');
  container.id = 'cw-root';
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  });
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    React.createElement(SiteChatComponentNew, {
      title: 'Chat with us',
      subtitle: 'We usually reply within a few minutes',
      defaultOpen: isDemoData,
      width: 380,
      height: 580,
      className: '',
      theme: parsedTheme as any,
      offlineForm: parsedOfflineForm as any,
      recaptchaSiteKey: wixRecaptchaVisibleSiteKey,
      onAttachment: (_file: File) => {},
      onOfflineSubmit: async (values: Record<string, unknown>, captchaToken: string) => {
        const fields = Array.isArray(parsedOfflineForm?.fields) ? parsedOfflineForm.fields : [];
        const baseApiUrl = new URL(import.meta.url).origin;
        const response = await myWixClient.fetchWithAuth(`${baseApiUrl}/api/offline-form/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formTitle: parsedOfflineForm?.title,
            fields,
            values,
            pageUrl: window.location.href,
            captchaToken,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Offline form submission failed');
      },
    }),
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatEmbed);
} else {
  initChatEmbed();
}

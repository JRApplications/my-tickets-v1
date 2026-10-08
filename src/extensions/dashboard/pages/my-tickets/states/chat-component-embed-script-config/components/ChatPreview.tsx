import { type FC } from 'react';
import type { ChatTheme } from '../chat-component-embed-script-config.types';
import { buildThemeVars, defaultTheme } from '../utils/theme';

interface PreviewMessage {
  id: string;
  role: 'agent' | 'user' | 'system';
  name?: string;
  text: string;
  time: string;
}

const MESSAGES: PreviewMessage[] = [
  { id: '1', role: 'system', text: 'Chat started', time: '9:00 AM' },
  { id: '2', role: 'agent', name: 'Support Agent', text: 'Hello! How can I help you today?', time: '9:01 AM' },
  { id: '3', role: 'user', text: 'Hi, I have a question about my order.', time: '9:02 AM' },
  { id: '4', role: 'agent', name: 'Support Agent', text: 'Of course! Please share your order number.', time: '9:02 AM' },
];

interface ChatPreviewProps {
  theme: Partial<ChatTheme>;
  width?: number;
  height?: number;
}

// ─── Shared chat panel markup ─────────────────────────────────────────────────

function ChatPanel({ theme, width = 340, height = 560 }: ChatPreviewProps) {
  const vars = buildThemeVars(theme, width, height) as React.CSSProperties;

  const s: Record<string, React.CSSProperties> = {
    root: {
      ...vars,
      width,
      height,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 'var(--cw-border-radius)',
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: 14,
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      height: 64,
      background: 'var(--cw-primary)',
      flexShrink: 0,
    },
    headerText: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 },
    headerTitle: { fontWeight: 600, fontSize: 15, color: 'var(--cw-header-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    headerSubtitle: { fontSize: 12, opacity: 0.85, color: 'var(--cw-header-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    headerActions: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
    headerEnd: {
      border: '1px solid var(--cw-header-text)', borderRadius: 6,
      background: 'transparent', color: 'var(--cw-header-text)', padding: '8px 10px',
      font: 'inherit', fontSize: 12, fontWeight: 600, lineHeight: 1, cursor: 'default',
    },
    headerClose: {
      background: 'none', border: 'none', color: 'var(--cw-header-text)',
      cursor: 'default', display: 'flex', alignItems: 'center', padding: 6, borderRadius: '50%',
    },
    body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    messageList: {
      flex: 1, display: 'flex', flexDirection: 'column', gap: 10,
      overflowY: 'auto', padding: 16, background: 'var(--cw-background)',
    },
    footer: {
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
      background: 'var(--cw-input-background)', borderTop: '1px solid var(--cw-input-border)',
      flexShrink: 0,
    },
    footerInput: {
      flex: 1, border: '1px solid var(--cw-input-border)', borderRadius: 8,
      padding: '8px 12px', fontSize: 14, background: 'var(--cw-input-background)',
      color: 'inherit', resize: 'none', outline: 'none',
    },
    footerBtn: {
      background: 'none', border: 'none', color: 'var(--cw-primary)',
      cursor: 'default', display: 'flex', alignItems: 'center', padding: 8,
      borderRadius: '50%', flexShrink: 0,
    },
  };

  return (
    <div style={s.root}>
      <header style={s.header}>
        <div style={s.headerText}>
          <span style={s.headerTitle}>Chat with us</span>
          <span style={s.headerSubtitle}>We usually reply within a few minutes</span>
        </div>
        <div style={s.headerActions}>
          <button style={s.headerEnd} tabIndex={-1} type="button">End chat</button>
          <button style={s.headerClose} tabIndex={-1} type="button" aria-label="Close chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </header>
      <div style={s.body}>
        <div style={s.messageList}>
          {MESSAGES.map((msg) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--cw-system-text)', padding: '4px 0' }}>
                  <div style={{ flex: 1, borderTop: '1px dashed var(--cw-system-text)', opacity: 0.3 }} />
                  <span style={{ fontStyle: 'italic', whiteSpace: 'nowrap' }}>{msg.text}</span>
                  <div style={{ flex: 1, borderTop: '1px dashed var(--cw-system-text)', opacity: 0.3 }} />
                </div>
              );
            }
            if (msg.role === 'agent') {
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '75%', alignSelf: 'flex-start' }}>
                  {msg.name && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--cw-system-text)', paddingLeft: 2 }}>{msg.name}</span>}
                  <div style={{ background: 'var(--cw-agent-bubble)', color: 'var(--cw-agent-text)', padding: '10px 14px', borderRadius: '18px 18px 18px 4px', fontSize: 14, lineHeight: 1.5 }}>{msg.text}</div>
                  <span style={{ fontSize: 11, color: 'var(--cw-system-text)', paddingLeft: 2 }}>{msg.time}</span>
                </div>
              );
            }
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, maxWidth: '75%', alignSelf: 'flex-end' }}>
                <div style={{ background: 'var(--cw-user-bubble)', color: 'var(--cw-user-text)', padding: '10px 14px', borderRadius: '18px 18px 4px 18px', fontSize: 14, lineHeight: 1.5 }}>{msg.text}</div>
                <span style={{ fontSize: 11, color: 'var(--cw-system-text)', paddingRight: 2 }}>{msg.time}</span>
              </div>
            );
          })}
        </div>
        <footer style={s.footer}>
          <button style={s.footerBtn} tabIndex={-1}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <div style={s.footerInput as React.CSSProperties}>
            <span style={{ color: 'var(--cw-system-text)', opacity: 0.6 }}>Type a message…</span>
          </div>
          <button style={s.footerBtn} tabIndex={-1}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─── Launcher button icon ─────────────────────────────────────────────────────

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
  </svg>
);

// ─── Start Chat state preview tab ────────────────────────────────────────────

export const StartChatPreview: FC<ChatPreviewProps> = ({ theme, width = 380, height = 620 }) => {
  const merged = { ...defaultTheme, ...theme };
  const vars = buildThemeVars(theme, width, height) as React.CSSProperties;

  const panelStyle: React.CSSProperties = {
    ...vars,
    width,
    height,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 'var(--cw-border-radius)',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    height: 64,
    background: 'var(--cw-primary)',
    flexShrink: 0,
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: '32px 24px',
    background: merged.startBackground ?? merged.background,
    textAlign: 'center',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 20,
    fontWeight: 700,
    color: merged.startTextColor ?? merged.agentText,
    margin: 0,
  };

  const descStyle: React.CSSProperties = {
    fontSize: 14,
    color: merged.startTextColor ?? merged.systemText,
    margin: 0,
    maxWidth: 260,
    lineHeight: 1.6,
    opacity: 0.8,
  };

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 20px',
    border: 'none',
    borderRadius: `${merged.buttonRadius ?? 8}px`,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'default',
    background: merged.startButtonColor ?? merged.primary,
    color: merged.startButtonTextColor ?? '#ffffff',
  };

  return (
    <div style={panelStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--cw-header-text)' }}>Chat with us</span>
          <span style={{ fontSize: 12, opacity: 0.85, color: 'var(--cw-header-text)' }}>We usually reply within a few minutes</span>
        </div>
        <button style={{ background: 'none', border: 'none', color: 'var(--cw-header-text)', cursor: 'default', display: 'flex', alignItems: 'center', padding: 6, borderRadius: '50%' }} tabIndex={-1}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>
      <div style={bodyStyle}>
        <h2 style={titleStyle}>Chat with us</h2>
        <p style={descStyle}>We usually reply within a few minutes</p>
        <div style={btnStyle}>Start Chat</div>
      </div>
    </div>
  );
};

// ─── Loading state preview tab ───────────────────────────────────────────────

export const LoadingStatePreview: FC<ChatPreviewProps> = ({ theme, width = 380, height = 620 }) => {
  const merged = { ...defaultTheme, ...theme };
  const vars = buildThemeVars(theme, width, height) as React.CSSProperties;

  const panelStyle: React.CSSProperties = {
    ...vars,
    width,
    height,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 'var(--cw-border-radius)',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    height: 64,
    background: 'var(--cw-primary)',
    flexShrink: 0,
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    background: merged.loadingBackground ?? merged.background,
    textAlign: 'center',
  };

  const spinnerColor = merged.loadingSpinnerColor ?? merged.primary;
  const trackColor = merged.border;

  const spinnerRingStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: `3px solid ${trackColor}`,
    borderTopColor: spinnerColor,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    color: merged.loadingTextColor ?? merged.agentText,
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 13,
    color: merged.loadingTextColor ?? merged.systemText,
    margin: 0,
    maxWidth: 240,
    lineHeight: 1.5,
    opacity: 0.75,
  };

  return (
    <div style={panelStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--cw-header-text)' }}>Chat with us</span>
          <span style={{ fontSize: 12, opacity: 0.85, color: 'var(--cw-header-text)' }}>We usually reply within a few minutes</span>
        </div>
        <button style={{ background: 'none', border: 'none', color: 'var(--cw-header-text)', cursor: 'default', display: 'flex', alignItems: 'center', padding: 6, borderRadius: '50%' }} tabIndex={-1}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>
      <div style={bodyStyle}>
        <div style={{ width: 48, height: 48 }}>
          <div style={spinnerRingStyle} />
        </div>
        <p style={titleStyle}>Connecting…</p>
        <p style={subtitleStyle}>Please wait while we connect you to an available agent.</p>
      </div>
    </div>
  );
};

// ─── Chat Ended state preview tab ────────────────────────────────────────────

export const ChatEndedPreview: FC<ChatPreviewProps> = ({ theme, width = 380, height = 620 }) => {
  const merged = { ...defaultTheme, ...theme };
  const vars = buildThemeVars(theme, width, height) as React.CSSProperties;

  const panelStyle: React.CSSProperties = {
    ...vars,
    width,
    height,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 'var(--cw-border-radius)',
    overflow: 'hidden',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    height: 64,
    background: 'var(--cw-primary)',
    flexShrink: 0,
  };

  const bodyStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '32px 24px',
    background: merged.endedBackground ?? merged.background,
    textAlign: 'center',
  };

  const iconColor = merged.endedIconColor ?? merged.primary;

  const iconWrapStyle: React.CSSProperties = {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: `${iconColor}1a`,
    color: iconColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: merged.endedTextColor ?? merged.agentText,
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 13,
    color: merged.endedTextColor ?? merged.systemText,
    margin: 0,
    maxWidth: 240,
    lineHeight: 1.6,
    opacity: 0.75,
  };

  return (
    <div style={panelStyle}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--cw-header-text)' }}>Chat with us</span>
          <span style={{ fontSize: 12, opacity: 0.85, color: 'var(--cw-header-text)' }}>We usually reply within a few minutes</span>
        </div>
        <button style={{ background: 'none', border: 'none', color: 'var(--cw-header-text)', cursor: 'default', display: 'flex', alignItems: 'center', padding: 6, borderRadius: '50%' }} tabIndex={-1}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>
      <div style={bodyStyle}>
        <div style={iconWrapStyle}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={titleStyle}>Chat Ended</p>
        <p style={subtitleStyle}>Your chat session has ended. Thank you for reaching out!</p>
      </div>
    </div>
  );
};

// ─── Chat Widget preview tab ──────────────────────────────────────────────────

export const ChatWidgetPreview: FC<ChatPreviewProps> = ({ theme, width = 300, height = 480 }) => (
  <ChatPanel theme={theme} width={width} height={height} />
);

// ─── Launcher Button preview tab ──────────────────────────────────────────────

interface LauncherPreviewProps {
  theme: Partial<ChatTheme>;
}

export const LauncherPreview: FC<LauncherPreviewProps> = ({ theme }) => {
  const merged = { ...defaultTheme, ...theme };
  const size = merged.launcherSize ?? 56;
  const radius = merged.launcherRadius ?? 50;

  const btn: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: `${radius}%`,
    background: merged.launcherBackground ?? merged.primary,
    color: merged.launcherIconColor ?? '#ffffff',
    border: `2px solid ${merged.launcherBorderColor ?? '#ffffff'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    cursor: 'default',
  };

  return (
    <div style={btn}>
      <ChatIcon />
    </div>
  );
};

// ─── Legacy combined export (kept for backward compat) ────────────────────────

export const ChatPreview: FC<ChatPreviewProps> = ({ theme, width = 340, height = 560 }) => (
  <ChatPanel theme={theme} width={width} height={height} />
);

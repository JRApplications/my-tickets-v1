import type { ChatTheme } from '../SiteChatComponentNew.types';

// ─── Fixed layout / typography constants ──────────────────────────────────────
// These are intentionally not themeable — only colours and border widths change.
const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif";
const FONT_SIZE = '14px';
const SHADOW = '0 4px 24px rgba(0,0,0,0.12)';
const WIDTH = '400px';
const HEIGHT = '600px';
const HEADER_HEIGHT = '64px';

// ─── Default colour theme ────────────────────────────────────────────────────

export const defaultTheme: ChatTheme = {
  primary: '#4f46e5',
  background: '#ffffff',
  surface: '#f9fafb',
  border: '#e5e7eb',
  userBubble: '#4f46e5',
  headerText: '#ffffff',
  userText: '#ffffff',
  agentBubble: '#f3f4f6',
  agentText: '#111827',
  systemText: '#6b7280',
  inputBackground: '#ffffff',
  inputBorder: '#d1d5db',
  buttonRadius: 8,
  borderRadius: 12,
  launcherBackground: '#4f46e5',
  launcherIconColor: '#ffffff',
  launcherBorderColor: '#ffffff',
  launcherSize: 56,
  launcherRadius: 50,
  startBackground: '#ffffff',
  startTextColor: '#111827',
  startButtonColor: '#4f46e5',
  startButtonTextColor: '#ffffff',
  endedBackground: '#ffffff',
  endedTextColor: '#111827',
  endedIconColor: '#4f46e5',
  loadingBackground: '#ffffff',
  loadingTextColor: '#111827',
  loadingSpinnerColor: '#4f46e5',
};

/**
 * Merges a partial user theme with the defaults and returns a style object
 * containing CSS custom properties. Layout/font values are always fixed.
 */
export function buildThemeVars(
  partial?: Partial<ChatTheme>,
  width?: number | string,
  height?: number | string,
): Record<string, string> {
  const theme: ChatTheme = { ...defaultTheme, ...partial };

  return {
    // Colours
    '--cw-primary': theme.primary,
    '--cw-background': theme.background,
    '--cw-surface': theme.surface,
    '--cw-border': theme.border,
    '--cw-user-bubble': theme.userBubble,
    '--cw-header-text': theme.headerText ?? theme.userText,
    '--cw-user-text': theme.userText,
    '--cw-agent-bubble': theme.agentBubble,
    '--cw-agent-text': theme.agentText,
    '--cw-system-text': theme.systemText,
    '--cw-input-background': theme.inputBackground,
    '--cw-input-border': theme.inputBorder,
    // Border radii
    '--cw-button-radius': `${theme.buttonRadius}px`,
    '--cw-border-radius': `${theme.borderRadius}px`,
    // Launcher
    '--cw-launcher-bg': theme.launcherBackground ?? theme.primary,
    '--cw-launcher-icon': theme.launcherIconColor ?? theme.userText,
    '--cw-launcher-border': theme.launcherBorderColor ?? theme.userText,
    '--cw-launcher-size': `${theme.launcherSize ?? 56}px`,
    '--cw-launcher-radius': `${theme.launcherRadius ?? 50}%`,
    // Start Chat state
    '--cw-start-background': theme.startBackground ?? theme.background,
    '--cw-start-text': theme.startTextColor ?? theme.agentText,
    '--cw-start-btn-bg': theme.startButtonColor ?? theme.primary,
    '--cw-start-btn-text': theme.startButtonTextColor ?? '#ffffff',
    // Chat Ended state
    '--cw-ended-background': theme.endedBackground ?? theme.background,
    '--cw-ended-text': theme.endedTextColor ?? theme.agentText,
    '--cw-ended-icon': theme.endedIconColor ?? theme.primary,
    // Loading state
    '--cw-loading-background': theme.loadingBackground ?? theme.background,
    '--cw-loading-text': theme.loadingTextColor ?? theme.agentText,
    '--cw-loading-spinner': theme.loadingSpinnerColor ?? theme.primary,
    // Fixed constants — not exposed as theme props
    '--cw-font-family': FONT_FAMILY,
    '--cw-font-size': FONT_SIZE,
    '--cw-shadow': SHADOW,
    '--cw-width': width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : WIDTH,
    '--cw-height': height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : HEIGHT,
    '--cw-header-height': HEADER_HEIGHT,
  };
}

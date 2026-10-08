import type { MemberTicketsTheme } from '../member-tickets-embed-script-config.types';

// ─── Default colour theme ────────────────────────────────────────────────────
// Mirrors the hard-coded defaults already baked into the component's CSS
// modules, so an empty/undefined saved theme renders identically to before.

export const defaultTheme: MemberTicketsTheme = {
  primary: '#2563eb',
  panelBackground: '#ffffff',
  surface: '#ffffff',
  emptyIconColor: '#e2e0e0',
  border: '#e2e8f0',
  divider: '#dcdcdc',
  text: '#0f172a',
  textSecondary: '#767676',
  muted: '#767676',
  ink: '#1a1a1a',
  borderRadius: 12,
  agentBubbleBackground: '#ffffff',
  agentBubbleText: '#181818',
  agentNameColor: '#181818',
  memberBubbleBackground: '#e2e0e0',
  memberBubbleText: '#181818',
  memberNameColor: '#181818',
  skeletonBase: '#ececec',
  skeletonShine: '#f6f6f6',
};

/**
 * Merges a partial user theme with the defaults and returns a style object
 * containing the exact CSS custom properties consumed across the
 * MemberTickets component tree. Apply this to a wrapping element so it
 * cascades down to every nested component (ticket list, ticket card,
 * selected-ticket thread, loading states, etc.).
 */
export function buildThemeVars(
  partial?: Partial<MemberTicketsTheme>,
): Record<string, string> {
  const theme: MemberTicketsTheme = { ...defaultTheme, ...partial };

  return {
    // Shared tokens used by both the live widget and the dashboard preview.
    '--MemberTickets-color-primary': theme.primary,
    '--MemberTickets-color-surface': theme.emptyIconColor,
    '--MemberTickets-color-text': theme.text,
    '--MemberTickets-color-text-secondary': theme.textSecondary,
    '--MemberTickets-color-border': theme.border,
    '--MemberTicketsBackground': theme.panelBackground,
    '--MemberTicketsBoxShadow': '0 4px 16px rgba(0, 0, 0, 0.08)',
    '--MemberTicketsBorderRadiusTopLeft': `${theme.borderRadius}px`,
    '--MemberTicketsBorderRadiusTopRight': `${theme.borderRadius}px`,
    '--MemberTicketsBorderRadiusBottomRight': `${theme.borderRadius}px`,
    '--MemberTicketsBorderRadiusBottomLeft': `${theme.borderRadius}px`,
    '--MemberTicketsFontFamily': 'Arial, sans-serif',
    '--MemberTickets-ink': theme.ink,
    '--MemberTickets-muted': theme.muted,
    '--MemberTickets-line': theme.divider,
    '--MemberTickets-surface': theme.surface,
    '--MemberTickets-skel': theme.skeletonBase,
    '--MemberTickets-skel-shine': theme.skeletonShine,
    '--MemberTicketsAgentBubbleBackground': theme.agentBubbleBackground,
    '--MemberTicketsAgentBubbleText': theme.agentBubbleText,
    '--MemberTicketsAgentNameColor': theme.agentNameColor,
    '--MemberTicketsMemberBubbleBackground': theme.memberBubbleBackground,
    '--MemberTicketsMemberBubbleText': theme.memberBubbleText,
    '--MemberTicketsMemberNameColor': theme.memberNameColor,
    // Legacy names remain for the preview component styles that still use them.
    '--color-primary': theme.primary,
    '--color-surface': theme.emptyIconColor,
    '--color-text': theme.text,
    '--color-text-secondary': theme.textSecondary,
    '--color-border': theme.border,
    '--ink': theme.ink,
    '--muted': theme.muted,
    '--line': theme.divider,
    '--surface': theme.surface,
    '--skel': theme.skeletonBase,
    '--skelShine': theme.skeletonShine,
    '--page': theme.panelBackground,
    // Selected-ticket message bubbles
    '--selectedTicketAgentMessageBackgroundColor': theme.agentBubbleBackground,
    '--selectedTicketAgentMessageTextColor': theme.agentBubbleText,
    '--selectedTicketAgentNameColor': theme.agentNameColor,
    '--selectedTicketCustomerMessageBackgroundColor': theme.memberBubbleBackground,
    '--selectedTicketCustomerMessageTextColor': theme.memberBubbleText,
    '--selectedTicketCustomerNameColor': theme.memberNameColor,
    // Loading skeletons (both the tickets-list and selected-ticket variants)
    '--skel-shine': theme.skeletonShine,
  };
}

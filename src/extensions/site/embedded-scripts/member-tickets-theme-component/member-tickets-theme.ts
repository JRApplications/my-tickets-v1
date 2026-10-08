const STYLE_TAG_ID = 'member-tickets-theme-styles';
const CONFIG_ID = 'member-tickets-theme-embed-config';

type Theme = {
  primary: string;
  panelBackground: string;
  surface: string;
  emptyIconColor: string;
  border: string;
  divider: string;
  text: string;
  textSecondary: string;
  muted: string;
  ink: string;
  borderRadius: number;
  agentBubbleBackground: string;
  agentBubbleText: string;
  agentNameColor: string;
  memberBubbleBackground: string;
  memberBubbleText: string;
  memberNameColor: string;
  skeletonBase: string;
  skeletonShine: string;
};

const defaultTheme: Theme = {
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

const config = document.getElementById(CONFIG_ID);
const encodedTheme = config?.getAttribute('data-theme-b64');
let savedTheme: Partial<Theme> = {};

try {
  if (encodedTheme) {
    const parsed: unknown = JSON.parse(atob(encodedTheme));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      savedTheme = parsed as Partial<Theme>;
    }
  }
} catch (error) {
  console.error('Failed to parse member tickets theme config', error);
}

const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value);

const theme = Object.fromEntries(
  Object.entries(defaultTheme).map(([key, fallback]) => {
    const value = savedTheme[key as keyof Theme];
    if (key === 'borderRadius') {
      return [key, typeof value === 'number' && Number.isFinite(value)
        ? Math.min(32, Math.max(0, value))
        : fallback];
    }
    return [key, isHexColor(value) ? value : fallback];
  }),
) as Theme;

const css = `
  :root {
    --MemberTickets-color-primary: ${theme.primary};
    --MemberTickets-color-surface: ${theme.emptyIconColor};
    --MemberTickets-color-text: ${theme.text};
    --MemberTickets-color-text-secondary: ${theme.textSecondary};
    --MemberTickets-color-border: ${theme.border};
    --MemberTicketsBackground: ${theme.panelBackground};
    --MemberTicketsBoxShadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    --MemberTicketsBorderRadiusTopLeft: ${theme.borderRadius}px;
    --MemberTicketsBorderRadiusTopRight: ${theme.borderRadius}px;
    --MemberTicketsBorderRadiusBottomRight: ${theme.borderRadius}px;
    --MemberTicketsBorderRadiusBottomLeft: ${theme.borderRadius}px;
    --MemberTicketsFontFamily: Arial, sans-serif;
    --MemberTickets-ink: ${theme.ink};
    --MemberTickets-muted: ${theme.muted};
    --MemberTickets-line: ${theme.divider};
    --MemberTickets-surface: ${theme.surface};
    --MemberTickets-skel: ${theme.skeletonBase};
    --MemberTickets-skel-shine: ${theme.skeletonShine};
    --MemberTicketsAgentBubbleBackground: ${theme.agentBubbleBackground};
    --MemberTicketsAgentBubbleText: ${theme.agentBubbleText};
    --MemberTicketsAgentNameColor: ${theme.agentNameColor};
    --MemberTicketsMemberBubbleBackground: ${theme.memberBubbleBackground};
    --MemberTicketsMemberBubbleText: ${theme.memberBubbleText};
    --MemberTicketsMemberNameColor: ${theme.memberNameColor};
  }

  ${config?.getAttribute('data-enabled') !== 'true' ? 'member-tickets { display: none !important; }' : ''}
`;

let styleTag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
if (!styleTag) {
  styleTag = document.createElement('style');
  styleTag.id = STYLE_TAG_ID;
  document.head.appendChild(styleTag);
}
styleTag.textContent = css;

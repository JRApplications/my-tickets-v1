// ─── Theme ────────────────────────────────────────────────────────────────────
// Maps 1:1 onto the CSS custom properties actually consumed by the
// MemberTickets component tree (see member-tickets.module.css and the
// component-level *.module.css files). Every field here has a matching
// `--variable` that buildThemeVars() sets on the preview/embed container.

export interface MemberTicketsTheme {
  /** Accent colour: open/back/send buttons, status value, "create ticket" button. */
  primary: string;
  /** Outer widget panel background. */
  panelBackground: string;
  /** Card / row surface colour (ticket cards, dropdown & search backgrounds). */
  surface: string;
  /** Icon colour for the "no tickets" empty state. */
  emptyIconColor: string;
  /** Divider / border colour (ticket cards, inputs, panel border). */
  border: string;
  /** Thin hairline colour (dropdown menu border, first ticket card top border). */
  divider: string;
  /** Primary text colour (ticket subject, reply input, empty-state title). */
  text: string;
  /** Secondary / muted text colour (submitted date, empty-state subtitle). */
  textSecondary: string;
  /** Muted icon/chevron colour. */
  muted: string;
  /** Selected-ticket header ticket-number & list controls text colour. */
  ink: string;
  /** Outer widget corner radius (px). */
  borderRadius: number;
  /** Agent (support) message bubble background. */
  agentBubbleBackground: string;
  /** Agent message bubble text colour. */
  agentBubbleText: string;
  /** Agent sender-name label colour. */
  agentNameColor: string;
  /** Member (customer) message bubble background. */
  memberBubbleBackground: string;
  /** Member message bubble text colour. */
  memberBubbleText: string;
  /** "Me" label colour above the member's own messages. */
  memberNameColor: string;
  /** Loading-skeleton base colour (shimmer track). */
  skeletonBase: string;
  /** Loading-skeleton highlight colour (shimmer sweep). */
  skeletonShine: string;
}

export const memberTicketsDesignElements = [
  'widget',
  'filterDropdown',
  'searchInput',
  'ticketCard',
  'emptyIcon',
  'emptyTitle',
  'emptySubtitle',
  'emptyButton',
  'backButton',
  'ticketNumber',
  'agentBubble',
  'agentName',
  'memberBubble',
  'memberName',
  'replyInput',
  'sendButton',
  'loadingSkeleton',
] as const;

export type MemberTicketsDesignElement = typeof memberTicketsDesignElements[number];

const memberTicketsDesignElementSet = new Set<string>(memberTicketsDesignElements);

export const isMemberTicketsDesignElement = (
  value: string | undefined,
): value is MemberTicketsDesignElement =>
  typeof value === 'string' && memberTicketsDesignElementSet.has(value);

// ─── Hook Return (kept for potential external consumers) ─────────────────────

export interface UseMemberTicketsReturn {
  open: boolean;
  openWidget: () => void;
  closeWidget: () => void;
}

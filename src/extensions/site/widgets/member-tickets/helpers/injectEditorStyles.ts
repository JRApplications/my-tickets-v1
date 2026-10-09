import { window as wixWindow } from "@wix/site-window";
import { embeddedScripts } from '@wix/app-management';
import { ExtensionIds } from "@jrapps/my_tickets_common_types";

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

type MemberTicketsSettings = {
    enabled: boolean;
    theme: Partial<MemberTicketsTheme>;
};

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

const STYLE_ID = 'member-tickets-editor-styles';
const CACHE_KEY = 'mt_editor_settings_v1';

export const injectEditorStyles = async () => {
    try {
        if (!(await needToInject())) return;

        // 1. Apply cached settings (or defaults) immediately, with no network wait.
        const cached = readCache();
        applyEditorStyles(cached ?? { enabled: true, theme: defaultTheme });

        // 2. Fetch fresh settings and re-apply only if they changed.
        const fresh = await fetchSettings();
        if (!cached || JSON.stringify(cached) !== JSON.stringify(fresh)) {
            applyEditorStyles(fresh);
            writeCache(fresh);
        }
    } catch (err: any) {
        if (err?.details?.applicationError?.code === 'NO_HTML_EMBEDS_ON_SITE') {
            applyEditorStyles({ enabled: true, theme: defaultTheme });
        }
        console.error('Error injecting editor styles:', err);
    }
};

const fetchSettings = async (): Promise<MemberTicketsSettings> => {
    const { parameters } = await embeddedScripts.getEmbeddedScript({
        componentId: ExtensionIds.MEMBER_TICKETS_EMBED_SCRIPT,
    });
    return {
        enabled: !!parameters?.enabled,
        theme: parameters?.themeB64 ? JSON.parse(atob(parameters.themeB64)) : { ...defaultTheme },
    };
};

const readCache = (): MemberTicketsSettings | null => {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const writeCache = (settings: MemberTicketsSettings) => {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(settings));
    } catch {
        // Storage may be unavailable in sandboxed iframes; safe to ignore.
    }
};

const needToInject = async (): Promise<boolean> => {
    try {
        const mode = await wixWindow.viewMode();
        return mode === 'Preview' || mode === 'Editor';
    } catch (e: any) {
        console.error('Error checking if need to inject editor styles:', e);
        return false;
    }
};

const applyEditorStyles = (settings: MemberTicketsSettings) => {
    // Merge with defaults so a missing key never renders as the string "undefined".
    const theme = { ...defaultTheme, ...settings.theme };

    const css = `
  :root {
    --MemberTickets-color-primary: ${theme.primary};
    --MemberTickets-color-surface: ${theme.surface};
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
    --MemberTickets-empty-icon: ${theme.emptyIconColor};
    --MemberTickets-skel: ${theme.skeletonBase};
    --MemberTickets-skel-shine: ${theme.skeletonShine};
    --MemberTicketsAgentBubbleBackground: ${theme.agentBubbleBackground};
    --MemberTicketsAgentBubbleText: ${theme.agentBubbleText};
    --MemberTicketsAgentNameColor: ${theme.agentNameColor};
    --MemberTicketsMemberBubbleBackground: ${theme.memberBubbleBackground};
    --MemberTicketsMemberBubbleText: ${theme.memberBubbleText};
    --MemberTicketsMemberNameColor: ${theme.memberNameColor};
  }
  `;

    // Reuse a single <style> element instead of appending a new one every call.
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
        el = document.createElement('style');
        el.id = STYLE_ID;
        document.head.appendChild(el);
    }
    if (el.textContent !== css) el.textContent = css;
};
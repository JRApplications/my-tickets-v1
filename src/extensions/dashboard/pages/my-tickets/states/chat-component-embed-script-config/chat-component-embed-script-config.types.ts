// ─── Message ─────────────────────────────────────────────────────────────────

export interface MessageProps {
  _id?: string;
  resourceId?: string;
  ticketId?: string;
  senderType?: 'user' | 'system' | 'agent';
  senderId?: string;
  message?: string;
  messageType?: 'TEXT' | 'ATTACHMENT';
  attachment?: {
    id: string;
    name: string;
    url: string;
  };
  item?: {
    id: string;
    name: string;
    url: string;
  };
  senderName?: string;
  timestamp?: number;
  teamId?: string;
}

// ─── Chat State ───────────────────────────────────────────────────────────────

export type ChatState =
  | 'LOADING'
  | 'START'
  | 'ONLINE'
  | 'OFFLINE'
  | 'ENDED';

// ─── System Message Events ────────────────────────────────────────────────────

export type SystemEventType =
  | 'AGENT_JOINED'
  | 'AGENT_LEFT'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'CHAT_ENDED'
  | 'CHAT_REOPENED'
  | 'CHAT_TRANSFERRED'
  | 'WAITING_FOR_AGENT';

// ─── Theme ────────────────────────────────────────────────────────────────────

export interface ChatTheme {
  /** Primary accent colour (header, user bubble, buttons). */
  primary: string;
  /** Main panel background. */
  background: string;
  /** Secondary surface colour (e.g. offline state background). */
  surface: string;
  /** Divider / border colour. */
  border: string;
  /** User message bubble background. */
  userBubble: string;
  /** Header title, subtitle & close button colour. */
  headerText: string;
  /** User message bubble text colour. */
  userText: string;
  /** Agent message bubble background. */
  agentBubble: string;
  /** Agent message bubble text colour. */
  agentText: string;
  /** System / timestamp text colour. */
  systemText: string;
  /** Input field background colour. */
  inputBackground: string;
  /** Input field border colour. */
  inputBorder: string;
  /** Border-radius for buttons (px). */
  buttonRadius: number;
  /** Border-radius for the widget panel and bubbles (px). */
  borderRadius: number;
  /** Launcher button background colour. Defaults to primary. */
  launcherBackground: string;
  /** Launcher button icon colour. */
  launcherIconColor: string;
  /** Launcher button border colour. */
  launcherBorderColor: string;
  /** Launcher button size in px. */
  launcherSize: number;
  /** Launcher button border-radius in px (50 = circle). */
  launcherRadius: number;
  /** Start Chat state background colour. */
  startBackground: string;
  /** Start Chat state title & description text colour. */
  startTextColor: string;
  /** Start Chat state button background colour. */
  startButtonColor: string;
  /** Start Chat state button text colour. */
  startButtonTextColor: string;
  /** Chat Ended state background colour. */
  endedBackground: string;
  /** Chat Ended state title & subtitle text colour. */
  endedTextColor: string;
  /** Chat Ended state icon colour. */
  endedIconColor: string;
  /** Loading state background colour. */
  loadingBackground: string;
  /** Loading state title & subtitle text colour. */
  loadingTextColor: string;
  /** Loading state spinner arc colour. */
  loadingSpinnerColor: string;
}

// ─── Offline Form ─────────────────────────────────────────────────────────────

export interface OfflineFieldOption {
  label: string;
  value: string;
}

export interface OfflineField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: OfflineFieldOption[];
}

export interface OfflineFormSchema {
  title: string;
  submitButtonText: string;
  fields: OfflineField[];
}

// ─── Header Props ─────────────────────────────────────────────────────────────

export interface HeaderProps {
  image?: string;
  title: string;
  subtitle?: string;
  onClose(): void;
  className: string;
}

// ─── Footer Props ─────────────────────────────────────────────────────────────

export interface FooterProps {
  onSend(message: string): void;
  onAttachment(file: File): void;
  disabled?: boolean;
}

// ─── Widget Props ─────────────────────────────────────────────────────────────

export interface ChatWidgetProps {
  className: any;
  /** Widget header title. */
  title: string;
  /** Width of the chat panel (e.g. '380px' or 380). Defaults to CSS value. */
  width?: number | string;
  /** Height of the chat panel (e.g. '600px' or 600). Defaults to CSS value. */
  height?: number | string;
  /** Widget header subtitle. */
  subtitle?: string;
  /** Avatar image shown in the header and Start Chat screen. */
  image?: string;
  /** Partial theme overrides — all values are optional. */
  theme?: Partial<ChatTheme>;
  /** Message history to render in the conversation. */
  messages: MessageProps[];
  /** When provided the widget shows the offline form instead of the chat. */
  offlineForm?: OfflineFormSchema;
  /** Open the panel on first render. Defaults to false. */
  defaultOpen?: boolean;
  /** Show the loading/connecting spinner instead of the message list. */
  loading?: boolean;
  /** Show the "Chat Ended" banner below the message list. */
  chatEnded?: boolean;
  /** Called with the message string when the user hits Send or Enter. */
  onSend(message: string): void;
  /** Called with the selected File when the user picks an attachment. */
  onAttachment(file: File): void;
  /** Called with form values when the offline form is submitted. */
  onOfflineSubmit(values: Record<string, unknown>): void;
  /** Called after the panel is dismissed via the header close button. */
  onClose?(): void;
}

// ─── Hook Return ──────────────────────────────────────────────────────────────

export interface UseChatWidgetReturn {
  open: boolean;
  openWidget: () => void;
  closeWidget: () => void;
}

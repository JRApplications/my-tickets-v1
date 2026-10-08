# ChatWidget

A production-ready, fully typed React chat support widget. Drop it into any React app — it manages its own open/close state, derives its display from the data you pass, and is fully themeable via colour and border props.

---

## Installation

```bash
# from the repo root
npm install
```

The widget has no runtime dependencies beyond React ≥ 18.

---

## Basic Usage

```tsx
import { ChatWidget } from '@jrapps/chat-widget';
import type { MessageProps } from '@jrapps/chat-widget';

export default function App() {
  const [messages, setMessages] = useState<MessageProps[]>([]);

  return (
    <ChatWidget
      title="Support Chat"
      subtitle="We typically reply in a few minutes"
      messages={messages}
      onSend={(text) => console.log('send:', text)}
      onAttachment={(file) => console.log('attachment:', file.name)}
      onOfflineSubmit={(values) => console.log('offline form:', values)}
    />
  );
}
```

The widget renders a fixed bottom-right launcher button. Clicking it opens the chat panel. The header's **×** button closes it.

---

## Props

### Required

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | Displayed in the header and Start Chat screen. |
| `messages` | `MessageProps[]` | The conversation history. Pass `[]` to show the Start Chat screen. |
| `onSend` | `(message: string) => void` | Called when the user submits a text message. |
| `onAttachment` | `(file: File) => void` | Called when the user selects a file attachment. |
| `onOfflineSubmit` | `(values: Record<string, unknown>) => void` | Called when the offline form is submitted. |

### Optional

| Prop | Type | Default | Description |
|---|---|---|---|
| `subtitle` | `string` | — | Secondary text shown beneath the title in the header. |
| `image` | `string` | — | Avatar URL shown in the header and Start Chat screen. |
| `theme` | `Partial<ChatTheme>` | — | Colour and border overrides (see [Theming](#theming)). |
| `offlineForm` | `OfflineFormSchema` | — | When provided, shows the offline form instead of the chat UI. |
| `defaultOpen` | `boolean` | `false` | Open the panel on first render. |
| `loading` | `boolean` | `false` | Show the connecting spinner instead of the message list. |
| `chatEnded` | `boolean` | `false` | Show the "Chat Ended" banner and hide the input footer. |
| `onClose` | `() => void` | — | Called after the panel is closed via the header × button. |

---

## Render Priority

The widget derives what to show from the props it receives, in this order:

1. `loading={true}` → connecting spinner
2. `offlineForm` provided → offline form
3. `messages.length === 0` → Start Chat screen
4. Messages present + `chatEnded={true}` → conversation + ended banner
5. Messages present → conversation + input footer

---

## Message Shape (`MessageProps`)

```ts
interface MessageProps {
  _id?: string;
  resourceId?: string;
  ticketId?: string;
  senderType?: 'user' | 'system' | 'agent';
  senderId?: string;
  message?: string;
  messageType?: 'TEXT' | 'ATTACHMENT';
  attachment?: { id: string; name: string; url: string };
  item?: { id: string; name: string; url: string };
  senderName?: string;
  timestamp?: number;   // Unix ms
  teamId?: string;
}
```

### Message rendering rules

| `senderType` | `messageType` | Renders as |
|---|---|---|
| `'user'` | `'TEXT'` | Right-aligned primary-colour bubble |
| `'agent'` | `'TEXT'` | Left-aligned bubble with avatar + name |
| `'system'` | `'TEXT'` | Dashed separator (e.g. `── Agent joined ──`) |
| any | `'ATTACHMENT'` | File card with filename and **Open** button |

### System event labels

Pass one of these strings as the `message` field on a `system` message and the widget will render the human-readable label automatically:

| Value | Rendered label |
|---|---|
| `AGENT_JOINED` | Agent joined |
| `AGENT_LEFT` | Agent left |
| `USER_JOINED` | You joined |
| `USER_LEFT` | You left |
| `CHAT_ENDED` | Chat ended |
| `CHAT_REOPENED` | Chat reopened |
| `CHAT_TRANSFERRED` | Chat transferred |
| `WAITING_FOR_AGENT` | Waiting for an agent |

---

## Theming

Pass a `Partial<ChatTheme>` to `theme`. Only the values you provide are overridden — everything else uses the defaults below.

```ts
interface ChatTheme {
  primary: string;         // Accent colour — header, user bubble, buttons
  background: string;      // Panel background
  surface: string;         // Secondary surface (offline state, etc.)
  border: string;          // Dividers and borders
  userBubble: string;      // User message bubble background
  userText: string;        // User message text
  agentBubble: string;     // Agent message bubble background
  agentText: string;       // Agent message text
  systemText: string;      // System messages and timestamps
  inputBackground: string; // Footer input background
  inputBorder: string;     // Footer input border
  buttonRadius: number;    // Button corner radius in px
  borderRadius: number;    // Panel and bubble corner radius in px
}
```

> **Note:** Font family, font size, panel dimensions, and shadow are intentionally fixed and cannot be changed via theme props.

### Default theme

```ts
{
  primary:         '#4f46e5',
  background:      '#ffffff',
  surface:         '#f9fafb',
  border:          '#e5e7eb',
  userBubble:      '#4f46e5',
  userText:        '#ffffff',
  agentBubble:     '#f3f4f6',
  agentText:       '#111827',
  systemText:      '#6b7280',
  inputBackground: '#ffffff',
  inputBorder:     '#d1d5db',
  buttonRadius:    8,
  borderRadius:    12,
}
```

### Dark theme example

```tsx
<ChatWidget
  title="Support"
  messages={messages}
  onSend={handleSend}
  onAttachment={handleAttachment}
  onOfflineSubmit={handleOfflineSubmit}
  theme={{
    primary:         '#818cf8',
    background:      '#1e1e2e',
    surface:         '#2a2a3c',
    border:          '#3d3d55',
    userBubble:      '#818cf8',
    userText:        '#ffffff',
    agentBubble:     '#2a2a3c',
    agentText:       '#e2e2ef',
    systemText:      '#9090a8',
    inputBackground: '#2a2a3c',
    inputBorder:     '#3d3d55',
    buttonRadius:    8,
    borderRadius:    14,
  }}
/>
```

---

## Offline Form

When the business is offline, pass an `offlineForm` prop built from a JSON schema. The form is rendered dynamically — no hardcoded fields.

```ts
interface OfflineFormSchema {
  title: string;
  submitButtonText: string;
  fields: OfflineField[];
}

interface OfflineField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];  // for 'select' type
}
```

### Example schema

```json
{
  "title": "Leave us a message",
  "submitButtonText": "Send Message",
  "fields": [
    { "id": "name",    "type": "text",     "label": "Full Name",      "required": true },
    { "id": "email",   "type": "email",    "label": "Email Address",  "required": true },
    { "id": "message", "type": "textarea", "label": "Message",        "required": true },
    {
      "id": "dept",
      "type": "select",
      "label": "Department",
      "required": true,
      "options": [
        { "label": "Sales",   "value": "sales" },
        { "label": "Support", "value": "support" }
      ]
    },
    { "id": "consent", "type": "checkbox", "label": "I agree to be contacted.", "required": true }
  ]
}
```

Submitted values are returned as `Record<string, unknown>` to `onOfflineSubmit`.

---

## Hooks

### `useChatWidget(defaultOpen?)`

Controls the widget panel programmatically from outside the component.

```ts
const { open, openWidget, closeWidget } = useChatWidget(false);

// open the panel from a button elsewhere on the page
<button onClick={openWidget}>Chat with us</button>
<ChatWidget ... />
```

### `useAutoScroll(dependency)`

Used internally by the message list. Scrolls to the newest message unless the user has manually scrolled up.

### `useOfflineForm(schema)`

Used internally by the offline form. Returns `{ values, errors, setValue, handleSubmit, reset }`.

---

## Accessibility

- Full keyboard navigation and `Tab` order
- `role="dialog"` / `aria-modal` on the panel
- `aria-live="polite"` on the message list for screen readers
- `aria-label` on all interactive controls
- `aria-invalid` + `aria-describedby` on form fields with errors
- `focus-visible` rings on all focusable elements

---

## Responsive behaviour

| Viewport | Behaviour |
|---|---|
| Desktop (> 768 px) | Fixed 400 × 600 px panel, bottom-right |
| Tablet (481–768 px) | Same floating panel, tighter margin |
| Mobile (≤ 480 px) | Full-screen panel, respects safe-area insets |

---

## Folder Structure

```
components/ChatWidget/
├── ChatWidget.tsx          Main component
├── ChatWidget.css          Shell layout + responsive breakpoints
├── ChatWidget.types.ts     All types and interfaces
├── useChatWidget.ts        Open/close state hook
├── index.ts                Barrel export
│
├── hooks/
│   ├── useAutoScroll.ts
│   └── useOfflineForm.ts
│
├── utils/
│   ├── theme.ts            buildThemeVars(), defaultTheme
│   ├── systemMessages.ts   Event → label mapping
│   └── format.ts           formatTime(), generateId()
│
├── Header/
├── Footer/
├── Messages/
│   ├── MessageList.tsx
│   ├── MessageRenderer.tsx
│   ├── UserMessage.tsx
│   ├── AgentMessage.tsx
│   ├── SystemMessage.tsx
│   ├── AttachmentMessage.tsx
│   └── TypingIndicator.tsx
│
├── States/
│   ├── LoadingState.tsx
│   ├── StartChatState.tsx
│   ├── OfflineState.tsx
│   └── ChatEndedState.tsx
│
├── OfflineForm/
│   └── OfflineForm.tsx
│
└── Shared/
    ├── Avatar.tsx
    └── Button.tsx
```

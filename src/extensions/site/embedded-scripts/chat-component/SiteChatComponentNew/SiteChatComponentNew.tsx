// SiteChatComponentNew.tsx
import classNames from 'classnames';
import React from 'react';
import { useConversation } from '../api/useConversation/useConversation';
import Footer from './Footer/Footer';
import Header from './Header/Header';
import { MessageList } from './Messages';
import styles from './SiteChatComponentNew.module.css';
import type { ChatWidgetProps, MessageProps } from './SiteChatComponentNew.types';
import { ChatEndedState, LoadingState, OfflineState, StartChatState } from './States';
import { useSiteChatComponentNew } from './useSiteChatComponentNew';
import { buildThemeVars } from './utils';
import { sendMessage as handleSendMessage } from '../api/sendMessage';
import { useChatConfig } from '../api/useChatConfig/useChatConfig';
import { local as wixLocalStorage } from "@wix/site-storage";

type BusinessSupportHours = NonNullable<ReturnType<typeof useChatConfig>['config']>['businessSupportHours'];

const getTimeMinutes = (value: string | Date | null | undefined): number | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getHours() * 60 + value.getMinutes();
  }

  const timeOnly = value.match(/^(\d{1,2}):(\d{2})/);
  if (timeOnly) return Number(timeOnly[1]) * 60 + Number(timeOnly[2]);

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getHours() * 60 + date.getMinutes();
};

const isWithinBusinessHours = (hours: BusinessSupportHours, now: Date): boolean => {
  if (!hours?.length) return true;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[now.getDay()];
  const previousDayName = dayNames[(now.getDay() + 6) % 7];
  const today = hours.find((entry) => entry.day?.toLowerCase().slice(0, 3) === todayName.slice(0, 3).toLowerCase());
  const previousDay = hours.find((entry) => entry.day?.toLowerCase().slice(0, 3) === previousDayName.slice(0, 3).toLowerCase());
  const isClosed = (entry: NonNullable<typeof today>) => entry.closed === true || (entry.closed as unknown) === 'true' || (entry.closed as unknown) === 1;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (today && !isClosed(today)) {
    const start = getTimeMinutes(today.startTime);
    const end = getTimeMinutes(today.endTime);
    // Unset or incomplete times mean no time restriction for this open day.
    if (start === null || end === null) return true;
    if (start === end || (start < end && currentMinutes >= start && currentMinutes < end)) return true;
    if (start > end && currentMinutes >= start) return true;
  }

  // Carry an overnight schedule from the previous day into the current day.
  if (previousDay && !isClosed(previousDay)) {
    const start = getTimeMinutes(previousDay.startTime);
    const end = getTimeMinutes(previousDay.endTime);
    if (start !== null && end !== null && start > end && currentMinutes < end) return true;
  }

  // If there is no entry for today, keep the chat available rather than
  // unexpectedly taking it offline because a schedule is incomplete.
  return !today;
};


export const SiteChatComponentNew = React.forwardRef<HTMLDivElement, ChatWidgetProps>(({
  title,
  subtitle,
  image,
  theme,
  offlineForm,
  recaptchaSiteKey,
  defaultOpen = false,
  loading = false,
  chatEnded = false,
  width,
  height,
  onAttachment,
  onOfflineSubmit,
  onClose
}, ref) => {
  const [conversationId, setConversationId] = React.useState<string>('');
  const { open = true, openWidget, closeWidget } = useSiteChatComponentNew(defaultOpen);
  const { messages, clearMessages, handleCreateConversation, endConversation, refetchConversation } = useConversation(conversationId ?? '');
  const { config, loading: isChatConfigLoading, sendQuestionMessage, sendWaitingForAgentMessage } = useChatConfig();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const launcherRef = React.useRef<HTMLButtonElement>(null);
  const wasOpenRef = React.useRef(open);
  const [businessHoursClock, setBusinessHoursClock] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = window.setInterval(() => setBusinessHoursClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const isBusinessOpen = isWithinBusinessHours(config?.businessSupportHours, businessHoursClock);
  const isOfflineState = Boolean(offlineForm && config && !isBusinessOpen);
  const themeVars = buildThemeVars(theme, width, height);

  React.useEffect(() => {
    const handleExternalOpen = () => {
      const chatWindow = window as Window & { __myTicketsOpenChatRequested?: boolean };
      if (!chatWindow.__myTicketsOpenChatRequested) return;
      chatWindow.__myTicketsOpenChatRequested = false;
      openWidget();
    };

    window.addEventListener('myTickets:openChat', handleExternalOpen);
    handleExternalOpen();
    return () => window.removeEventListener('myTickets:openChat', handleExternalOpen);
  }, [openWidget]);

  // --- Pre-chat question flow state ---
  // For a brand-new visitor, questions are asked locally (no conversation
  // exists yet) and only get sent anywhere once every question is answered.
  const [askingQuestions, setAskingQuestions] = React.useState(false);
  const questionIndexRef = React.useRef(0);
  const questionFlowStartedRef = React.useRef(false);
  const answersRef = React.useRef<string[]>([]);

  const hasQuestions = !!config?.enableChatQuestions && (config.chatQuestions?.length ?? 0) > 0;
  const questionTextSet = React.useMemo(
    () => new Set(config?.chatQuestions ?? []),
    [config?.chatQuestions]
  );


  const QUESTION_SENDER_TYPE: MessageProps['senderType'] = 'agent';
  const VISITOR_SENDER_TYPE: MessageProps['senderType'] = 'visitor';

  const [pendingMessages, setPendingMessages] = React.useState<MessageProps[]>([]);
  const [locallyEnded, setLocallyEnded] = React.useState(false);
  const [isEndingChat, setIsEndingChat] = React.useState(false);
  const [endChatError, setEndChatError] = React.useState<string | null>(null);
  const [isStartingOver, setIsStartingOver] = React.useState(false);
  const [startOverError, setStartOverError] = React.useState<string | null>(null);
  const [hasStartedOver, setHasStartedOver] = React.useState(false);

  const addPending = (text: string, senderType: MessageProps['senderType']) => {
    const pendingMessage: MessageProps = {
      _id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message: text,
      senderType,
      messageType: 'TEXT',
      timestamp: Date.now(),
    };
    setPendingMessages((prev) => [...prev, pendingMessage]);
    return pendingMessage._id;
  };

  const startWaitingForAgent = async (id: string, pendingId = addPending('WAITING_FOR_AGENT', 'system')) => {
    // The caller can show the status as soon as the visitor finishes the
    // questionnaire, before conversation persistence and routing complete.
    try {
      const result = await sendWaitingForAgentMessage(id);
      if (!result?.success) {
        throw new Error(result?.error ?? 'Failed to set waiting for agent');
      }
    } catch (error) {
      setPendingMessages((prev) => prev.filter((message) => message._id !== pendingId));
      throw error;
    }
  };


  const lastRealCountRef = React.useRef(0);
  React.useEffect(() => {
    const realCount = messages?.length ?? 0;
    const growth = realCount - lastRealCountRef.current;
    if (growth > 0 && pendingMessages.length > 0) {
      setPendingMessages((prev) => prev.slice(Math.min(growth, prev.length)));
    }
    lastRealCountRef.current = realCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const displayMessages: MessageProps[] = [...(messages ?? []), ...pendingMessages].map((msg) => {

    if (msg.senderType === 'system' && msg.message && questionTextSet.has(msg.message)) {
      return { ...msg, senderType: 'agent' };
    }
    return msg;
  });
  const conversationHasEnded = (chatEnded && !hasStartedOver) || locallyEnded || displayMessages.some(
    (message) => message.senderType === 'system' && message.message === 'CHAT_ENDED'
  );

  const handleClose = React.useCallback(() => {
    closeWidget();
    onClose?.();
  }, [closeWidget, onClose]);

  React.useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) launcherRef.current?.focus();
      wasOpenRef.current = false;
      return;
    }
    wasOpenRef.current = true;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'iframe',
      '[contenteditable="true"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');
    const getFocusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => element.getClientRects().length > 0
        && window.getComputedStyle(element).visibility !== 'hidden'
        && element.getAttribute('aria-hidden') !== 'true');

    dialog.querySelector<HTMLElement>('button[aria-label="Close chat"]')?.focus();
    if (!dialog.contains(document.activeElement)) dialog.focus();

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) {
        (getFocusableElements()[0] ?? dialog).focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [open, handleClose]);

  const handleEndChat = async () => {
    if (!conversationId || isEndingChat) return;
    setIsEndingChat(true);
    setEndChatError(null);
    try {
      await endConversation(conversationId);
      setLocallyEnded(true);
    } catch (error) {
      console.error('Failed to end chat:', error);
      setEndChatError('Could not end chat. Please try again.');
    } finally {
      setIsEndingChat(false);
    }
  };

  const handleStartOver = async () => {
    if (!conversationHasEnded || isStartingOver) return;
    const previousConversationId = conversationId;
    const wasLocallyEnded = locallyEnded;
    let newChatStarted = false;
    setIsStartingOver(true);
    setStartOverError(null);
    try {
      await wixLocalStorage.removeItem('myTicketsConversationId');
      setConversationId('');
      clearMessages();
      setPendingMessages([]);
      setAskingQuestions(false);
      questionFlowStartedRef.current = false;
      questionIndexRef.current = 0;
      answersRef.current = [];
      setEndChatError(null);

      if (hasQuestions && config?.chatQuestions?.length) {
        setLocallyEnded(false);
        setHasStartedOver(true);
        setAskingQuestions(true);
        addPending(config.chatQuestions[0], QUESTION_SENDER_TYPE);
        newChatStarted = true;
        return;
      }

      const newConversationId = await handleCreateConversation(null);
      if (!newConversationId) throw new Error('Could not create a new chat');
      await wixLocalStorage.setItem('myTicketsConversationId', newConversationId);
      setLocallyEnded(false);
      setHasStartedOver(true);
      setConversationId(newConversationId);
      newChatStarted = true;
      await startWaitingForAgent(newConversationId);
    } catch (error) {
      console.error('Failed to start a new chat:', error);
      if (!newChatStarted) {
        setHasStartedOver(false);
        setLocallyEnded(wasLocallyEnded);
        if (previousConversationId) {
          setConversationId(previousConversationId);
          try {
            await wixLocalStorage.setItem('myTicketsConversationId', previousConversationId);
            await refetchConversation(previousConversationId);
          } catch (restoreError) {
            console.error('Failed to restore the previous chat after starting over failed:', restoreError);
          }
        }
        setStartOverError('Could not start a new chat. Please try again.');
      } else {
        setStartOverError('Your new chat started, but we could not connect it to support. Please try sending a message.');
      }
    } finally {
      setIsStartingOver(false);
    }
  };

  // On load, check local storage for an existing conversation. If one is
  // there, just fetch its latest state — this is what actually creates a
  // conversationId, which in turn is what lets the realtime subscriptions
  // (see useConversation) start.
  const resumeCheckedRef = React.useRef(false);
  React.useEffect(() => {
    if (resumeCheckedRef.current) return;
    resumeCheckedRef.current = true;

    (async () => {
      const existingConversationId = await wixLocalStorage.getItem('myTicketsConversationId');
      if (existingConversationId) {
        const id = await handleCreateConversation(existingConversationId);
        setConversationId(id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startQuestionFlow = async (id: string) => {
    // Guards against double-firing (e.g. StrictMode, accidental double click)
    if (questionFlowStartedRef.current) return;
    questionFlowStartedRef.current = true;

    const questions = config?.enableChatQuestions ? (config.chatQuestions ?? []) : [];

    if (questions.length > 0) {
      questionIndexRef.current = 0;
      setAskingQuestions(true);
      addPending(questions[0], QUESTION_SENDER_TYPE); // show it instantly, don't wait on the network
      await sendQuestionMessage(id, questions[0]);
    } else {
      // Nothing to ask — go straight to "waiting for agent"
      await startWaitingForAgent(id);
    }
  };

  const handleStartChat = async () => {
    // Already have (or just resumed) an existing conversation — keep using
    // it and carry on the question flow / normal chat inside it.
    let id = conversationId;
    if (!id) {
      const existingConversationId = await wixLocalStorage.getItem('myTicketsConversationId');
      if (existingConversationId) {
        id = await handleCreateConversation(existingConversationId);
        setConversationId(id);
      }
    }

    if (id) {
      questionFlowStartedRef.current = false; // fresh flow for this session
      await startQuestionFlow(id);
      return;
    }

    // Brand-new visitor with questions enabled — ask them locally first.
    // No conversation is created yet; it's only created once every
    // question has been answered (see handleFooterSend below).
    if (hasQuestions && config?.chatQuestions?.length) {
      questionIndexRef.current = 0;
      answersRef.current = [];
      setAskingQuestions(true);
      addPending(config.chatQuestions[0], QUESTION_SENDER_TYPE);
      return;
    }

    // Brand-new visitor, no questions — create the conversation right
    // away and proceed as normal.
    const newId = await handleCreateConversation(null);
    await wixLocalStorage.setItem('myTicketsConversationId', newId);
    setConversationId(newId);
    await startWaitingForAgent(newId);
  };

  const handleFooterSend = async (message: string) => {
    // Show the outgoing message immediately — the real one from
    // `messages` will replace it once the backend call resolves.
    addPending(message, VISITOR_SENDER_TYPE);

    // --- Local pre-chat questionnaire (no conversation exists yet) ---
    if (askingQuestions && !conversationId && config?.chatQuestions) {
      answersRef.current.push(message);
      const nextIndex = questionIndexRef.current + 1;
      questionIndexRef.current = nextIndex;

      if (nextIndex < config.chatQuestions.length) {
        // Still more questions — show the next one locally. Nothing is
        // created or sent to the backend until the questionnaire is done.
        addPending(config.chatQuestions[nextIndex], QUESTION_SENDER_TYPE);
        return;
      }

      // Every question has been answered — NOW create the conversation,
      // then replay the full Q&A history into it, in order, so the agent
      // sees it as normal chat history, and finally proceed as usual.
      const waitingPendingId = addPending('WAITING_FOR_AGENT', 'system');
      setAskingQuestions(false);
      try {
        const id = await handleCreateConversation(null);
        await wixLocalStorage.setItem('myTicketsConversationId', id);
        setConversationId(id);

        for (let i = 0; i < config.chatQuestions.length; i++) {
          await sendQuestionMessage(id, config.chatQuestions[i]);
          await handleSendMessage(id, answersRef.current[i], 'message');
        }

        await startWaitingForAgent(id, waitingPendingId);
      } catch (error) {
        setPendingMessages((prev) => prev.filter((message) => message._id !== waitingPendingId));
        throw error;
      }
      return;
    }

    // --- Mid-conversation questionnaire (resumed / already-created conversation) ---
    if (askingQuestions && conversationId && config?.chatQuestions) {
      const nextIndex = questionIndexRef.current + 1;
      questionIndexRef.current = nextIndex;

      if (nextIndex < config.chatQuestions.length) {
        // Show the next question right away too, so the questionnaire
        // feels instant — the network calls below still fire in the
        // original, safe order underneath.
        addPending(config.chatQuestions[nextIndex], QUESTION_SENDER_TYPE);
      }
      const waitingPendingId = nextIndex >= config.chatQuestions.length
        ? addPending('WAITING_FOR_AGENT', 'system')
        : undefined;

      // Must await — sending the next question before this resolves can
      // race with it on the backend and land out of order.
      await handleSendMessage(conversationId, message, 'message');

      if (nextIndex < config.chatQuestions.length) {
        await sendQuestionMessage(conversationId, config.chatQuestions[nextIndex]);
      } else {
        setAskingQuestions(false);
        await startWaitingForAgent(conversationId, waitingPendingId);
      }
      return;
    }

    const result = await handleSendMessage(conversationId, message, 'message');
    if (!result.success) {
      throw result.error instanceof Error ? result.error : new Error('Failed to send message.');
    }
  };

  /**
   * Derive what to render from data:
   *  loading=true          → spinner
   *  offlineForm provided  → offline form
   *  no messages yet       → Start Chat screen
   *  messages present      → conversation (+ optional ended banner)
   */
  const renderBody = () => {
    // Resolve business hours before choosing between the offline form and
    // the initial Start Chat screen.
    if (loading) {
      return <LoadingState />;
    }

    if (offlineForm && isChatConfigLoading) {
      return <LoadingState />;
    }

    if (isOfflineState && offlineForm) {
      return <OfflineState form={offlineForm} recaptchaSiteKey={recaptchaSiteKey} onSubmit={onOfflineSubmit} />;
    }

    if (!displayMessages || displayMessages.length === 0) {
      return (
        <StartChatState
          image={image}
          title={title}
          description={subtitle}
          onStart={handleStartChat}
        />
      );
    }

    return (
      <>
        <MessageList messages={displayMessages} />
        {conversationHasEnded ? (
          <ChatEndedState />
        ) : (
          <Footer
            onTypingStarted={() => { if (conversationId) handleSendMessage(conversationId, 'start', 'typing'); }}
            onTypingStopped={() => { if (conversationId) handleSendMessage(conversationId, 'stop', 'typing'); }}
            onSend={handleFooterSend}
            onAttachment={(file) => {
              if (!conversationId) throw new Error('Start a chat before sending an attachment.');
              return onAttachment(file, conversationId);
            }}
            disabled={isEndingChat}
          />
        )}
      </>
    );
  };

  return (
    <div ref={ref} className={'cw__root'} data-element="cw__root" style={{ ...themeVars as React.CSSProperties }}>
      {/* Chat panel */}
      {open && (
        <div
          ref={dialogRef}
          className={classNames("cw__widget", styles.cw__widget)}
          data-element="cw__root"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} chat widget`}
          tabIndex={-1}
          style={{
            width: 'var(--cw-width)',
            height: 'var(--cw-height)',
          }}
        >
          <Header
            image={image}
            className="cw__header"
            title={title}
            subtitle={subtitle}
            onClose={handleClose}
            onEndChat={!isOfflineState && conversationId && !conversationHasEnded ? handleEndChat : undefined}
            onStartOver={!isOfflineState && conversationHasEnded ? handleStartOver : undefined}
            endingChat={isEndingChat}
            startingOver={isStartingOver}
            endChatError={isOfflineState ? null : endChatError}
            startOverError={isOfflineState ? null : startOverError}
          />
          <div className={classNames("cw__widget__body", styles.cw__widget__body)}>{renderBody()}</div>
        </div>
      )}


      {/* Launcher button — only visible when the panel is closed */}

      {!open && (
        <button
          ref={launcherRef}
          className={classNames("cw_launcher", styles.cw_launcher)}
          onClick={openWidget}
          aria-label="Open chat"
          aria-haspopup="dialog"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </button>
      )}
    </div>
  );
});

SiteChatComponentNew.displayName = 'SiteChatComponentNew';

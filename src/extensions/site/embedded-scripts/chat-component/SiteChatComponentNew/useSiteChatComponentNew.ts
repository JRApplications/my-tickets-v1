import { useState, useCallback, useEffect } from 'react';
import type { UseChatWidgetReturn } from './SiteChatComponentNew.types';

declare global {
  interface Window {
    myTickets?: { openChat?: () => void };
  }
}

export function useSiteChatComponentNew(defaultOpen = false): UseChatWidgetReturn {
  const [open, setOpen] = useState(defaultOpen);

  const openWidget = useCallback(() => setOpen(true), []);
  const closeWidget = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const api = (window.myTickets = window.myTickets ?? {});
    api.openChat = openWidget;
    return () => {
      if (api.openChat === openWidget) delete api.openChat;
    };
  }, [openWidget]);

  return { open, openWidget, closeWidget };
}

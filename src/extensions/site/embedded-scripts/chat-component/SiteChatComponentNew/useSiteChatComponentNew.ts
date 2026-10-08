import { useState, useCallback } from 'react';
import type { UseChatWidgetReturn } from './SiteChatComponentNew.types';

export function useSiteChatComponentNew(defaultOpen = false): UseChatWidgetReturn {
  const [open, setOpen] = useState(defaultOpen);

  const openWidget = useCallback(() => setOpen(true), []);
  const closeWidget = useCallback(() => setOpen(false), []);

  return { open, openWidget, closeWidget };
}

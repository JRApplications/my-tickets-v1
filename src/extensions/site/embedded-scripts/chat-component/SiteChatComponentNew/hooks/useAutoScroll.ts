import { useEffect, useRef, useState } from 'react';

/**
 * Attaches a ref to a scrollable container. Automatically scrolls to the
 * bottom when new content is added, unless the user has manually scrolled up.
 */
export function useAutoScroll<T extends HTMLElement>(
  dependency: unknown,
): React.MutableRefObject<T | null> {
  const ref = useRef<T | null>(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 64;
      userScrolledUp.current = !atBottom;
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || userScrolledUp.current) return;

    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [dependency]);

  return ref;
}

/**
 * Expose a way for the consumer to force-scroll to bottom (e.g. when
 * the user clicks a "scroll to bottom" button).
 */
export function useAutoScrollWithControl<T extends HTMLElement>(
  dependency: unknown,
): {
  ref: React.MutableRefObject<T | null>;
  scrollToBottom: () => void;
  isScrolledUp: boolean;
} {
  const ref = useRef<T | null>(null);
  const userScrolledUp = useRef(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 64;
      userScrolledUp.current = !atBottom;
      setIsScrolledUp(!atBottom);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || userScrolledUp.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [dependency]);

  const scrollToBottom = () => {
    const el = ref.current;
    if (!el) return;
    userScrolledUp.current = false;
    setIsScrolledUp(false);
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  return { ref, scrollToBottom, isScrolledUp };
}

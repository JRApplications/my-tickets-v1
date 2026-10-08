import { useCallback, useEffect, useRef, useState } from 'react';
import { subscriber } from '@wix/realtime';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { getAgentActivitySessionId } from '../../SidebarProvider/useTeamPresence';

const VIEWING_TTL_MS = 60_000;
const TYPING_TTL_MS = 10_000;
const HEARTBEAT_MS = 20_000;
const TYPING_REPUBLISH_MS = 4_000;
const TYPING_IDLE_MS = 6_000;

type PresenceState = 'viewing' | 'typing';
type PresenceAction = PresenceState | 'left' | 'replied' | 'roster-request';
interface PresenceEntry { agentId: string; agentName: string; state: PresenceState; receivedAt: number }

export interface TicketViewer { agentId: string; name: string; typing: boolean }
export interface TicketReply { agentName: string }

export function useTicketPresence(ticketId: string, agentId: string) {
    const [entries, setEntries] = useState<Record<string, PresenceEntry>>({});
    const [reply, setReply] = useState<TicketReply | null>(null);
    const [, setClock] = useState(0);
    const sessionIdRef = useRef('');
    const stateRef = useRef<PresenceState>('viewing');
    const isSubscribedRef = useRef(false);
    const lastTypingPublishRef = useRef(0);
    const typingIdleTimerRef = useRef<number | undefined>(undefined);
    if (!sessionIdRef.current && typeof window !== 'undefined') sessionIdRef.current = getAgentActivitySessionId();

    const publish = useCallback(async (action: PresenceAction) => {
        if (!ticketId || !agentId || (action !== 'left' && document.visibilityState !== 'visible')) return;
        try {
            await myTicketsFetchWithAuth(`${new URL(import.meta.url).origin}/api/tickets/presence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId, action, sessionId: sessionIdRef.current }),
            });
        } catch (error) {
            console.error('Failed to publish ticket presence', error);
        }
    }, [ticketId, agentId]);

    useEffect(() => {
        setEntries({});
        setReply(null);
        stateRef.current = 'viewing';
        if (!ticketId || !agentId) return;

        const channel = { name: 'AGENT_TICKET_PRESENCE', resourceId: ticketId };
        const heartbeat = () => {
            if (isSubscribedRef.current) void publish(stateRef.current);
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') heartbeat();
            else void publish('left');
        };

        subscriber.subscribe(channel, (message, receivedChannel) => {
            if (receivedChannel.name !== channel.name || receivedChannel.resourceId !== ticketId) return;
            const payload = message.payload;
            if (!payload || typeof payload.agentId !== 'string' || payload.agentId === agentId) return;

            if (payload.type === 'roster-request') {
                void publish(stateRef.current);
            } else if (payload.type === 'ticket-presence') {
                const key = `${payload.agentId}:${payload.sessionId || 'default'}`;
                setEntries((current) => {
                    const next = { ...current };
                    if (payload.state === 'viewing' || payload.state === 'typing') {
                        next[key] = { agentId: payload.agentId, agentName: String(payload.agentName || 'Another agent'), state: payload.state, receivedAt: Date.now() };
                    } else {
                        delete next[key];
                    }
                    return next;
                });
            } else if (payload.type === 'ticket-replied') {
                setReply({ agentName: String(payload.agentName || 'Another agent') });
            }
        }, {
            onSubscribed: () => {
                isSubscribedRef.current = true;
                void (async () => {
                    await publish('roster-request');
                    await publish(stateRef.current);
                })();
            },
            onSubscriptionError: (error) => {
                isSubscribedRef.current = false;
                console.error('Ticket presence subscription failed', error);
            },
        });

        const heartbeatTimer = window.setInterval(heartbeat, HEARTBEAT_MS);
        const expiryTimer = window.setInterval(() => setClock(Date.now()), 5_000);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            isSubscribedRef.current = false;
            window.clearTimeout(typingIdleTimerRef.current);
            window.clearInterval(heartbeatTimer);
            window.clearInterval(expiryTimer);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            subscriber.unsubscribe({ channel });
            void publish('left');
        };
    }, [ticketId, agentId, publish]);

    const notifyTyping = useCallback((isTyping: boolean) => {
        window.clearTimeout(typingIdleTimerRef.current);
        if (!isTyping) {
            if (stateRef.current === 'typing') {
                stateRef.current = 'viewing';
                void publish('viewing');
            }
            return;
        }
        const now = Date.now();
        if (stateRef.current !== 'typing' || now - lastTypingPublishRef.current > TYPING_REPUBLISH_MS) {
            stateRef.current = 'typing';
            lastTypingPublishRef.current = now;
            void publish('typing');
        }
        typingIdleTimerRef.current = window.setTimeout(() => {
            stateRef.current = 'viewing';
            void publish('viewing');
        }, TYPING_IDLE_MS);
    }, [publish]);

    const notifyReplied = useCallback(() => {
        window.clearTimeout(typingIdleTimerRef.current);
        stateRef.current = 'viewing';
        void (async () => {
            await publish('replied');
            await publish('viewing');
        })();
    }, [publish]);

    const dismissReply = useCallback(() => setReply(null), []);

    const now = Date.now();
    const byAgent = new Map<string, TicketViewer>();
    for (const entry of Object.values(entries)) {
        const age = now - entry.receivedAt;
        if (age >= VIEWING_TTL_MS) continue;
        const typing = entry.state === 'typing' && age < TYPING_TTL_MS;
        const existing = byAgent.get(entry.agentId);
        byAgent.set(entry.agentId, { agentId: entry.agentId, name: entry.agentName, typing: typing || existing?.typing === true });
    }

    return { viewers: Array.from(byAgent.values()), reply, notifyTyping, notifyReplied, dismissReply };
}

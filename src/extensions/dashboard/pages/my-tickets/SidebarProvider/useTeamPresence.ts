import { useCallback, useEffect, useRef, useState } from 'react';
import { subscriber } from '@wix/realtime';
import { myTicketsFetchWithAuth } from '../auth/myTicketsFetchWithAuth';

const ONLINE_WINDOW_MS = 90_000;
const SESSION_ID_KEY = 'my-tickets-activity-session-id';
export type AgentAvailability = 'online' | 'busy' | 'offline';

export function getAgentActivitySessionId(): string {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
        sessionId = typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
}

export function useTeamPresence(teamId: string, agentId: string): { onlineCount: number; status: AgentAvailability; setStatus: (status: AgentAvailability) => void } {
    const [presence, setPresence] = useState<Record<string, { agentId: string; status: AgentAvailability; updatedAt: number }>>({});
    const [status, setStatusState] = useState<AgentAvailability>('online');
    const [, setClock] = useState(0);
    const sessionIdRef = useRef('');
    const statusRef = useRef<AgentAvailability>(status);
    const isSubscribedRef = useRef(false);
    statusRef.current = status;
    if (!sessionIdRef.current && typeof window !== 'undefined') sessionIdRef.current = getAgentActivitySessionId();
    const onlineCount = new Set(Object.values(presence)
        .filter((entry) => entry.status === 'online' && Date.now() - entry.updatedAt < ONLINE_WINDOW_MS)
        .map((entry) => entry.agentId)).size;
    const publish = useCallback(async (action: AgentAvailability | 'roster-request') => {
        if (!teamId || !agentId || (action !== 'offline' && document.visibilityState !== 'visible')) return;
        const localPresenceId = `${agentId}:${sessionIdRef.current}`;
        if (action === 'online' || action === 'busy') {
            setPresence((current) => ({ ...current, [localPresenceId]: { agentId, status: action, updatedAt: Date.now() } }));
        } else if (action === 'offline') {
            setPresence((current) => {
                const next = { ...current };
                delete next[localPresenceId];
                return next;
            });
        }
        try {
            await myTicketsFetchWithAuth(`${new URL(import.meta.url).origin}/api/agents/activity-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, sessionId: sessionIdRef.current }),
            });
        } catch (error) {
            console.error('Failed to publish team activity', error);
        }
    }, [teamId, agentId]);

    const setStatus = useCallback((nextStatus: AgentAvailability) => {
        statusRef.current = nextStatus;
        setStatusState(nextStatus);
        void publish(nextStatus);
    }, [publish]);

    useEffect(() => {
        if (!teamId || !agentId) return;
        const channel = { name: 'AGENT_BACKEND_ACTIVITY_STATUS', resourceId: teamId };
        const heartbeat = () => {
            if (isSubscribedRef.current && statusRef.current !== 'offline') void publish(statusRef.current);
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') heartbeat();
            else void publish('offline');
        };
        subscriber.subscribe(channel, (message, receivedChannel) => {
            if (receivedChannel.name !== channel.name || receivedChannel.resourceId !== teamId) return;
            const payload = message.payload;
            if (payload?.type === 'roster-request' && payload.agentId !== agentId && document.visibilityState === 'visible') {
                void publish(statusRef.current);
            } else if (payload?.type === 'agent-presence' && typeof payload.agentId === 'string') {
                setPresence((current) => {
                    const presenceId = `${payload.agentId}:${payload.sessionId || 'default'}`;
                    if (payload.status === 'offline') {
                        const next = { ...current };
                        delete next[presenceId];
                        return next;
                    }
                    if (payload.status !== 'online' && payload.status !== 'busy') return current;
                    return { ...current, [presenceId]: { agentId: payload.agentId, status: payload.status, updatedAt: Number(payload.updatedAt) || Date.now() } };
                });
            }
        }, {
            onSubscribed: () => {
                isSubscribedRef.current = true;
                void (async () => {
                    await publish('roster-request');
                    await publish(statusRef.current);
                })();
            },
            onSubscriptionError: (error) => {
                isSubscribedRef.current = false;
                console.error('Team activity subscription failed', error);
            },
        });
        const heartbeatTimer = window.setInterval(heartbeat, 30_000);
        const expiryTimer = window.setInterval(() => setClock(Date.now()), 15_000);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            isSubscribedRef.current = false;
            subscriber.unsubscribe({ channel });
            window.clearInterval(heartbeatTimer);
            window.clearInterval(expiryTimer);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [teamId, agentId, publish]);

    return { onlineCount, status, setStatus };
}

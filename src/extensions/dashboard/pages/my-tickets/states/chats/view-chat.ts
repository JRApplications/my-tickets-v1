// admin / agent
import { useState, useEffect, useRef } from 'react';
import { subscriber } from '@wix/realtime';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';

const CONNECTION_PING_INTERVAL = 15000; // send a ping every 15s
const CONNECTION_PONG_TIMEOUT = 5000;  // if no pong within 5s, flag error

export const useMessages = (
    conversationId: string,
    agentId: string,
    teamId: string,
    {
        onChatEnded,
        onTransferChatRequested,
    }: {
        onChatEnded: () => void;
        onTransferChatRequested: (params: { conversationId: string; teamId: string }) => void;
    }
) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [currentAgentJoined, setCurrentAgentJoined] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [status, setStatus] = useState<'error' | 'warning' | 'success'>('warning');
    const [isSiteUserTyping, setIsSiteUserTyping] = useState(false);
    const [userName, setUserName] = useState('');
    const [userType, setUserType] = useState<'member' | 'visitor'>();
    const [memberId, setMemberId] = useState('');

    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isJoiningRef = useRef(false);
    const isLeavingRef = useRef(false);
    const isEndingRef = useRef(false);

    const getUpdatedMessages = async () => {
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/chat-admin/getUpdatedMessages?conversationId=${conversationId}`);
            if (!response.ok) {
                throw new Error(`Failed to load chat (${response.status})`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Failed to load chat');
            }
            setMessages(result.data.messages || []);
            setCurrentAgentJoined(result.data.currentAgentId === agentId || false);
            setUserName(result.data.userName || '');
            setUserType(result.data.userType);
            setMemberId(result.data.memberId || '');
            setIsError(false);
        } catch (error: any) {
            console.error('Failed to get updated messages', error.message);
            setIsError(true);
        }
    }

    useEffect(() => {
        if (!conversationId) {
            setMessages([]);
            setCurrentAgentJoined(false);
            setUserName('');
            setUserType(undefined);
            setMemberId('');
            setIsLoading(false);
            setIsError(false);
            return;
        }

        setIsLoading(true);
        setIsError(false);
        getUpdatedMessages().finally(() => setIsLoading(false));
    }, [conversationId]);

    const sendMessage = async (message: string, attachments: Array<{ id: string; name: string; url: string }>): Promise<boolean> => {
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/chat-admin/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId, message, agentId, attachments }),
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                ShowToast({ message: 'Failed to send message. Please try again.', type: 'error' });
                return false;
            }
            return true;
        } catch (error: any) {
            console.error('Failed to send message', error.message);
            ShowToast({ message: 'Failed to send message. Please try again.', type: 'error' });
            return false;
        }
    };

    // Publishes { checkingConnection: true } on channel1 (this is the "ping").
    const sendConnectionMessage = async () => {
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/chat-admin/sendConnectionMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId }),
            });
            const result = await response.json();
            if (!result.success) {
                console.error('Failed to send connection message:', result.message);
            }
        } catch (error) {
            console.error('Failed to send connection message:', error);
        }
    };

    const clearPongTimeout = () => {
        if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
            pongTimeoutRef.current = null;
        }
    };

    // Send a ping, then arm a watchdog: if the site doesn't echo back
    // within CONNECTION_PONG_TIMEOUT, mark the connection as errored.
    const sendPing = async () => {
        await sendConnectionMessage();
        clearPongTimeout();
        pongTimeoutRef.current = setTimeout(() => {
            setStatus('error');
        }, CONNECTION_PONG_TIMEOUT);
    };

    useEffect(() => {
        if (!conversationId) return;

        const channel = { name: 'SITE_LIVE_CHAT', resourceId: conversationId };
        const channel1 = { name: 'SITE_LIVE_CHAT_CONNECTION_CHECKER', resourceId: conversationId };

        subscriber.subscribe(
            channel,
            async (message, channel) => {
                const channelName = channel.name;
                const channelResourceId = channel.resourceId;
                if (channelName === 'SITE_LIVE_CHAT' && channelResourceId === conversationId) {
                    let payload = message.payload;
                    if (payload.messageType === 'message') {
                        await getUpdatedMessages();
                    } else if (payload.messageType === 'typing' && payload.message === 'start') {
                        setIsSiteUserTyping(true);
                    } else if (payload.messageType === 'typing' && payload.message === 'stop') {
                        setIsSiteUserTyping(false);
                    }
                }
            },
            {
                onSubscribed: () => setStatus('success'),
                onSubscriptionError: (error) => { setStatus('error'); console.error('Subscription error', error); },
            }
        );

        subscriber.subscribe(
            channel1,
            async (message, channel) => {
                const channelName = channel.name;
                const channelResourceId = channel.resourceId;
                if (channelName === 'SITE_LIVE_CHAT_CONNECTION_CHECKER' && channelResourceId === conversationId) {
                    const payload = message.payload;
                    // Only { connection: true } is the site's pong. Explicitly ignore
                    // { checkingConnection: true }, which is our own ping shape — in case
                    // the realtime layer ever echoes a publisher's own message back to it.
                    if (payload?.connection === true) {
                        clearPongTimeout();
                        setStatus('success');
                    }
                }
            },
            {
                onSubscribed: async () => {
                    // Fire the first ping immediately, then keep pinging every 30s.
                    await sendPing();
                    pingIntervalRef.current = setInterval(sendPing, CONNECTION_PING_INTERVAL);
                },
                onSubscriptionError: (error) => { console.error('Failed to subscribe to realtime: ', error); setStatus('error'); },
            }
        );

        return () => {
            subscriber.unsubscribe({ channel });
            subscriber.unsubscribe({ channel: channel1 });
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            clearPongTimeout();
        };
    }, [conversationId]);

    const joinChat = async () => {
        if (isJoiningRef.current || currentAgentJoined) return;
        isJoiningRef.current = true;
        setIsJoining(true);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/chat-admin/joinChat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conversationId, agentId }), // Replace 'agent-id' with actual agent ID
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to join chat');
            }
            setCurrentAgentJoined(true);
        } catch (error) {
            console.error('Failed to join chat:', error);
        } finally {
            isJoiningRef.current = false;
            setIsJoining(false);
        }
    };

    const leaveChat = async (): Promise<boolean> => {
        if (isLeavingRef.current || !currentAgentJoined) return false;
        isLeavingRef.current = true;
        setIsLeaving(true);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/chat-admin/leaveChat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conversationId, agentId }), // Replace 'agent-id' with actual agent ID
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to leave chat');
            }
            setCurrentAgentJoined(false);
            return true;
        } catch (error) {
            console.error('Failed to leave chat:', error);
            return false;
        } finally {
            isLeavingRef.current = false;
            setIsLeaving(false);
        }
    };

    const endChat = async () => {
        if (isEndingRef.current) return;
        isEndingRef.current = true;
        setIsEnding(true);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/chat-admin/endChat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conversationId, agentId }), // Replace 'agent-id' with actual agent ID
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to end chat');
            }
            onChatEnded();
        } catch (error) {
            console.error('Failed to end chat:', error);
        } finally {
            isEndingRef.current = false;
            setIsEnding(false);
        }
    };

    const onTransferChat = async () => {
        if (!conversationId || !teamId) return;
        onTransferChatRequested({ conversationId, teamId });
    };

    return {
        messages,
        sendMessage,
        connectionStatus: status,
        isSiteUserTyping,
        joinChat,
        leaveChat,
        endChat,
        currentAgentJoined,
        isJoining,
        isLeaving,
        isEnding,
        userName,
        userType,
        memberId,
        isLoading,
        isError,
        onTransferChat,
    };
};

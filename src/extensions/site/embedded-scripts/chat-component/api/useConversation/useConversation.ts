// useConversation.ts
// site embedded chat component
import { useEffect, useState } from 'react';
import { sendMessage } from '../sendMessage';
import { myWixClient } from '../../wixClient';
import { RealtimeSubscriptionClient } from '../../realtimeWixClient';

const MESSAGE_TYPES_THAT_UPDATE_CONVERSATION = ['message', 'system', 'questionMessage'];

const isConversationId = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    const normalized = value.trim();
    return normalized !== '' && normalized !== 'null' && normalized !== 'undefined';
};

export const useConversation = (conversationId: string) => {
    const [messages, setMessages] = useState<any[]>([]);

    const fetchUpdatedConversation = async (id = conversationId) => {
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            if (!isConversationId(id)) return;
            const response = await myWixClient.fetchWithAuth(`${baseApiUrl}/api/chat/getUpdatedConversation?conversationId=${encodeURIComponent(id)}`);
            const data = await response.json();
            if (data.success) {
                setMessages(data.data?.messages ?? []);
            } else {
                console.error('Failed to fetch updated conversation:', data.message);
            }
        } catch (error) {
            console.error('Failed to fetch updated conversation:', error);
        }
    };

    // Publishes { connection: true } on channel1 (this is the "pong").
    const sendConnectionMessage = async () => {
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myWixClient.fetchWithAuth(`${baseApiUrl}/api/chat/sendConnectionMessage`, {
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

    const endConversation = async (id: string) => {
        const baseApiUrl = new URL(import.meta.url).origin;
        const response = await myWixClient.fetchWithAuth(`${baseApiUrl}/api/chat/endConversation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: id }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error ?? 'Failed to end chat');
        }
    };

    useEffect(() => {
        // Don't subscribe to anything until we actually have a conversation
        // (either freshly created or resumed/fetched from local storage).
        if (!conversationId) {
            return;
        }

        const channel = { name: 'SITE_LIVE_CHAT', resourceId: conversationId };
        const channel1 = { name: 'SITE_LIVE_CHAT_CONNECTION_CHECKER', resourceId: conversationId };

        RealtimeSubscriptionClient.subscriber.subscribe(
            channel,
            async (message, channel) => {
                const channelName = channel.name;
                const channelResourceId = channel.resourceId;
                if (channelName === 'SITE_LIVE_CHAT' && channelResourceId === conversationId) {
                    const payload = message.payload;
                    if (MESSAGE_TYPES_THAT_UPDATE_CONVERSATION.includes(payload.messageType)) {
                        await fetchUpdatedConversation();
                    }
                }
            },
            {
                onSubscribed: async () => { console.log('Subscribed to SITE_LIVE_CHAT channel'); await sendMessage(conversationId, 'stop', 'typing'); },
                onSubscriptionError: (error) => { console.error('Failed to subscribe to realtime: ', error); },
            }
        );

        RealtimeSubscriptionClient.subscriber.subscribe(
            channel1,
            async (message, channel) => {
                const channelName = channel.name;
                const channelResourceId = channel.resourceId;
                if (channelName === 'SITE_LIVE_CHAT_CONNECTION_CHECKER' && channelResourceId === conversationId) {
                    const payload = message.payload;
                    if (payload?.checkingConnection === true) {
                        await sendConnectionMessage();
                    }
                }
            },
            {
                onSubscribed: () => { console.log('Subscribed to SITE_LIVE_CHAT_CONNECTION_CHECKER channel'); },
                onSubscriptionError: (error) => { console.error('Failed to subscribe to realtime: ', error); },
            }
        );

        return () => {
            RealtimeSubscriptionClient.subscriber.unsubscribe({ channel });
            RealtimeSubscriptionClient.subscriber.unsubscribe({ channel: channel1 });
        };
    }, [conversationId]);

    const createConversation = async (currentId: string | null) => {
        try {
            if (isConversationId(currentId)) {
                // Already have a conversation (e.g. resumed from local
                // storage) — just fetch its latest state, don't create a
                // new one.
                await fetchUpdatedConversation(currentId);
                return currentId;
            }
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myWixClient.fetchWithAuth(`${baseApiUrl}/api/chat/createConversation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.success) {
                await fetchUpdatedConversation(result.conversationId);
                return result.conversationId;
            } else {
                console.error('Failed to create conversation:', result.message);
            }
        } catch (error) {
            console.error('Failed to create conversation:', error);
        }
    };

    return {
        messages,
        handleCreateConversation: createConversation,
        endConversation,
        refetchConversation: fetchUpdatedConversation,
    };
};

import { useState, useEffect } from "react";
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { subscriber } from '@wix/realtime';

interface Chat {
    _id: string;
    siteUserName: string;
    siteUserType: string;
    status: string;
}

export const useChatSidebar = (teamId: string) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');

    const fetchUpdatedChats = async () => {
        setIsError(false);
        if (!teamId) {
            setIsError(true);
            return;
        }
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/chat-admin/getSidebarItems?teamId=${teamId}`);
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || `Failed to load chats (${response.status})`);
            }
            setChats(data.chats || []);
        } catch (error) {
            console.error("Failed to fetch chats", error);
            setIsError(true);
        }
    };

    useEffect(() => {
        const fetchChats = async () => {
            setIsLoading(true);
            setIsError(false);
            if (!teamId) {
                setIsLoading(false);
                setIsError(true);
                return;
            }
            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/chat-admin/getSidebarItems?teamId=${teamId}`);
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || `Failed to load chats (${response.status})`);
                }
                setChats(data.chats || []);
            } catch (error) {
                console.error("Failed to fetch chats", error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChats();
    }, [teamId]);

    const updateChat = (chatId: string, updates: { status?: string }) => {
        setChats(prevChats =>
            prevChats.map(chat =>
                chat._id === chatId
                    ? { ...chat, ...updates }
                    : chat
            )
        );
    };

    useEffect(() => {
        if (!teamId) {
            setConnectionStatus('unknown');
            return;
        }

        const channel = { name: 'SITE_LIVE_CHAT_TEAM', resourceId: teamId };

        subscriber.subscribe(
            channel,
            async (message, channel) => {
                const channelName = channel.name;
                const channelResourceId = channel.resourceId;
                if (channelName === 'SITE_LIVE_CHAT_TEAM' && channelResourceId === teamId) {
                    let payload = message.payload;
                    await fetchUpdatedChats();
                }
            },
            {
                onSubscribed: () => { setConnectionStatus('connected'), console.log('Subscribed to chat team sidebar successfully'); },
                onSubscriptionError: (error) => { setConnectionStatus('disconnected'); console.error('Subscription error', error); },
            }
        );


        return () => {
            subscriber.unsubscribe({ channel });
        };
    }, [teamId]);

    return {
        chats,
        isLoading,
        isError,
        updateChat,
        connectionStatus
    };
};

import { useState, useEffect } from 'react';
import ChatWidgetConfigWrapper from './chat-widget-config.wrapper';
import { fetchChatWidgetConfig, saveChatWidgetConfig } from './chat-widget-config';
import type { Config } from './chat-widget-config.types';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';

interface ConfigCache {
    config: Config;
    configId?: string;
}

const chatWidgetCache = new Map<string, ConfigCache>();
const CACHE_KEY = 'chat-widget-config';

interface ChatWidgetConfigProps {
    permissions: string[];
}

const ChatWidgetConfig = ({ permissions }: ChatWidgetConfigProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState<Config | undefined>(() => chatWidgetCache.get(CACHE_KEY)?.config);
    const [isLoading, setIsLoading] = useState(() => !chatWidgetCache.get(CACHE_KEY));
    const [configId, setConfigId] = useState<string | undefined>(() => chatWidgetCache.get(CACHE_KEY)?.configId);

    useEffect(() => {
        const loadConfig = async () => {
            const cached = chatWidgetCache.get(CACHE_KEY);
            if (cached) {
                setConfig(cached.config);
                setConfigId(cached.configId);
            } else {
                setIsLoading(true);
            }

            try {
                const data = await fetchChatWidgetConfig();
                chatWidgetCache.set(CACHE_KEY, { config: data, configId: data?._id || undefined });
                setConfigId(data?._id || undefined);
                setConfig(data);
            } catch (error: any) {
                console.error(error.message);
                if (!chatWidgetCache.has(CACHE_KEY)) {
                    ShowToast({message: error.message, type: 'error'});
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadConfig();
    }, []);

    const handleOnsave = async (config: Config) => {
        setIsSaving(true);
        try {
            const data = await saveChatWidgetConfig({ ...config, _id: configId });
            const updated = { config: data.config, configId: data._id };
            chatWidgetCache.set(CACHE_KEY, updated);
            setConfigId(data._id);
            setConfig(data.config);
            ShowToast({message: 'Chat widget configuration saved successfully', type: 'success'});
        } catch (error: any) {
            console.error(error.message);
            ShowToast({message: error.message, type: 'error'});
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ChatWidgetConfigWrapper onSave={handleOnsave} isSaving={isSaving} config={config} isLoading={isLoading} permissions={permissions} />
    );
}

export default ChatWidgetConfig;
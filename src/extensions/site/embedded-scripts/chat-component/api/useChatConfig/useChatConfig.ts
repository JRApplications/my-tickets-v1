// src/component/api/useChatConfig/useChatConfig.ts
import { useEffect, useState } from 'react';
import { myWixClient } from '../../wixClient';

export interface ChatTeam {
  _id: string;
  name: string;
  tags: string[];
}

export interface ChatConfig {
  enableChatQuestions: boolean;
  chatQuestions: string[];
  businessSupportHours?: Array<{
    day: string;
    closed: boolean;
    startTime: string | Date | null;
    endTime: string | Date | null;
  }> | null;
}

export const useChatConfig = () => {
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchConfig = async () => {
      try {
        const baseApiUrl = new URL(import.meta.url).origin;
        let chatConfig: any = null;

        try {
          const response = await myWixClient.fetchWithAuth(`${baseApiUrl}/api/chat/getChatConfig`);
          const result = await response.json();
          if (result.success) chatConfig = result.data ?? result;
        } catch (error) {
          console.warn('Failed to load site chat config; trying the saved chat settings.', error);
        }

        if (!Array.isArray(chatConfig?.businessSupportHours)) {
          try {
            const fallbackResponse = await myWixClient.fetchWithAuth(`${baseApiUrl}/api/chat-settings/get`);
            const fallbackResult = await fallbackResponse.json();
            const fallbackConfig = fallbackResult.data?.businessSupportHours !== undefined ? fallbackResult.data : fallbackResult;
            if (fallbackResult.success) chatConfig = { ...chatConfig, ...fallbackConfig };
          } catch (error) {
            console.warn('Failed to load saved chat settings.', error);
          }
        }

        if (cancelled) return;

        if (chatConfig) {
          setConfig({
            enableChatQuestions: Boolean(chatConfig.enableChatQuestions),
            chatQuestions: Array.isArray(chatConfig.chatQuestions) ? chatConfig.chatQuestions : [],
            businessSupportHours: Array.isArray(chatConfig.businessSupportHours) ? chatConfig.businessSupportHours : [],
          });
        } else {
          setError('Failed to load chat config');
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendQuestionMessage = async (conversationId: string, question: string) => {
    try {
      const baseApiUrl = new URL(import.meta.url).origin;
      const response = await myWixClient.fetchWithAuth(`${baseApiUrl}/api/chat/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversationId, message: question, messageType: 'questionMessage' })
      });
      const result = await response.json();
      return result;
    } catch (err: any) {
      console.error('Failed to send question message', err);
      throw err;
    }
  };
  const sendWaitingForAgentMessage = async (conversationId: string) => {
    try {
      const baseApiUrl = new URL(import.meta.url).origin;
      const response = await myWixClient.fetchWithAuth(`${baseApiUrl}/api/chat/setWaitingForAgent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversationId })
      });
      const result = await response.json();
      return result;
    } catch (err: any) {
      console.error('Failed to send waiting for agent message', err);
      throw err;
    }
  };

  return { config, loading, error, sendQuestionMessage, sendWaitingForAgentMessage };
};

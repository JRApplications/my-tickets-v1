// sendMessage.ts
import { myWixClient } from './../../wixClient';
import { httpClient } from '@wix/essentials';

interface ChatAttachment {
  id: string;
  name: string;
  url: string;
}

export const sendMessage = async (
  conversationId: string,
  message: string,
  messageType: string,
  attachments?: ChatAttachment[],
) => {
  try {
    const baseApiUrl = new URL(import.meta.url).origin;
    const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/chat/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId, message, messageType, attachments }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message ?? 'Failed to send message');
    }
    return { success: true, message: 'Message sent successfully', data };
  } catch (error) {
    console.error('Failed to send message:', error);
    return { success: false, error };
  }
};
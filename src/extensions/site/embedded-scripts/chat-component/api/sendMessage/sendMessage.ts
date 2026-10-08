// sendMessage.ts
import { myWixClient } from './../../wixClient';

export const sendMessage = async (conversationId: string, message: string, messageType: string) => {
  try {
    const baseApiUrl = new URL(import.meta.url).origin;
    const response = await myWixClient.fetchWithAuth(`${baseApiUrl}/api/chat/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversationId, message, messageType }),
    });
    const data = await response.json();
    return { success: true, message: 'Message sent successfully', data };
  } catch (error) {
    console.error('Failed to send message:', error);
    return { success: false, error };
  }
};
import { httpClient } from '@wix/essentials';

// Called when the visitor clicks Start chat, before they join anything.
// Throws the friendly message when the site's monthly chat limit is reached.
// Fails open: any other problem lets the visitor carry on.
export async function checkChatAvailable(): Promise<void> {
    let result: any = null;
    try {
        const baseApiUrl = new URL(import.meta.url).origin;
        const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/chat/checkChatAvailability`);
        if (response.ok) result = await response.json();
    } catch (error) {
        console.error('Could not check chat availability', error);
        return;
    }
    if (result && result.available === false) {
        throw new Error(typeof result.message === 'string' ? result.message : 'Live chat is unavailable right now. Please try again later.');
    }
}

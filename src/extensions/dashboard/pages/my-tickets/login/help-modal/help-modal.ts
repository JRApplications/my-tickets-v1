import { getWixServerBaseUrl } from '../../../../../api-url';
import { httpClient } from '@wix/essentials';

const baseApiUrl = getWixServerBaseUrl(import.meta.url);

export const getAppInstance = async () => {
    const response = await httpClient.fetchWithAuth(`${baseApiUrl}/help-modal/get-instance`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error);
    }
    return data.instance;
};

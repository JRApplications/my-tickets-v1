import { WIX_CLIENT_SECRET } from "astro:env/server";

export const generateElevatedAuthToken = async (authToken: string | null): Promise<string> => {
    const instanceId = await getTokenInfo(authToken);
    const response = await fetch('https://www.wixapis.com/oauth2/token', {
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
            "grant_type": "client_credentials",
            "client_id": "90136a5c-0752-4121-8520-78063fefafc6",
            "client_secret": WIX_CLIENT_SECRET,
            "instance_id": instanceId,
        })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Wix OAuth credential exchange failed with status ${response.status}`);
    }
    return data.access_token;
};

const getTokenInfo = async (authToken: string | null) => {
    if (!authToken) {
        throw new Error('Authorization token is missing');
    }
    const response = await fetch('https://www.wixapis.com/oauth2/token-info', {
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
            "token": authToken
        })
    });

    if (!response.ok) {
        throw new Error(`Wix OAuth credential inspection failed with status ${response.status}`);
    }

    const result = await response.json();
    return result.instanceId;
}

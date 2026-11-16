export const checkPermission = async (authToken: string | null, requiredPermission: string[]): Promise<boolean> => {
    if (!authToken) {
        throw new Error('Authorization token is missing');
    }

    const tokenInfo = await getTokenInfo(authToken);
    switch (tokenInfo) {
        case 'USER':
            return requiredPermission.includes('USER');
        case 'APP':
            return requiredPermission.includes('APP');
        case 'MEMBER':
            return requiredPermission.includes('MEMBER');
        case 'VISITOR':
            return requiredPermission.includes('VISITOR');
        default:
            throw new Error(`Unknown subject type: ${tokenInfo}`);
    }
}

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
    return result.subjectType;
}

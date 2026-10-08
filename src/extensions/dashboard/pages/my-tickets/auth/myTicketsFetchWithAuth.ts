import { httpClient } from '@wix/essentials';

const TOKEN_KEY = 'my-tickets-auth-token';
const EXPIRY_KEY = 'my-tickets-auth-token-expires-at';
const AUTH_HEADER = 'x-my-tickets-auth';
const BASE_API_URL = new URL(import.meta.url).origin;
let inMemoryToken: string | null = null;
let inMemoryExpiresAt = 0;

export function storeMyTicketsAgentSession(token: string, expiresAt: number, rememberMe: boolean): void {
    inMemoryToken = null;
    inMemoryExpiresAt = 0;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    if (rememberMe) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(EXPIRY_KEY, String(expiresAt));
        return;
    }

    inMemoryToken = token;
    inMemoryExpiresAt = expiresAt;
}

export function clearMyTicketsAgentSession(): void {
    inMemoryToken = null;
    inMemoryExpiresAt = 0;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    window.dispatchEvent(new Event('my-tickets-auth-expired'));
}

async function getAgentAuthToken(): Promise<string> {
    const isRemembered = Boolean(localStorage.getItem(TOKEN_KEY));
    let token = isRemembered ? localStorage.getItem(TOKEN_KEY) : inMemoryToken;
    const expiresAt = isRemembered
        ? Number(localStorage.getItem(EXPIRY_KEY) ?? 0)
        : inMemoryExpiresAt;
    const now = Math.floor(Date.now() / 1000);

    if (!token) {
        clearMyTicketsAgentSession();
        throw new Error('My Tickets agent authentication is required. Please sign in again.');
    }
    if (expiresAt > now + 60) return token;

    const response = await httpClient.fetchWithAuth(new URL('/api/my-tickets-auth/refresh', BASE_API_URL).toString(), {
        method: 'POST',
        headers: { [AUTH_HEADER]: token },
    });
    const result = await response.json();
    if (!response.ok || !result.success || !result.token) {
        clearMyTicketsAgentSession();
        throw new Error('Your My Tickets session has expired. Please sign in again.');
    }

    token = result.token;
    if (!token) {
        clearMyTicketsAgentSession();
        throw new Error('Failed to refresh My Tickets agent authentication token. Please sign in again.');
    }
    if (isRemembered) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(EXPIRY_KEY, String(result.expiresAt));
    } else {
        inMemoryToken = token;
        inMemoryExpiresAt = result.expiresAt;
    }
    return token;
}

export const myTicketsFetchWithAuth = async (
    input: string | URL | Request,
    init?: RequestInit,
): Promise<Response> => {
    const token = await getAgentAuthToken();
    const requestUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(requestUrl, BASE_API_URL).toString();
    // Wix's fetchWithAuth spreads requestInit.headers into a plain object.
    // A Headers instance is not enumerable, so convert it before passing it in
    // or the custom agent token header gets silently dropped by the SDK.
    const headers: Record<string, string> = {};
    if (input instanceof Request) {
        new Headers(input.headers).forEach((value, key) => { headers[key] = value; });
    }
    new Headers(init?.headers).forEach((value, key) => { headers[key] = value; });
    headers[AUTH_HEADER] = token;

    const requestInit: RequestInit = input instanceof Request
        ? { method: input.method, body: input.body, ...init, headers }
        : { ...init, headers };

    return httpClient.fetchWithAuth(url, requestInit);
};

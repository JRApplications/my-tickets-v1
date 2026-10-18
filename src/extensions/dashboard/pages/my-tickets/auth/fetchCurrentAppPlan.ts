import { httpClient } from '@wix/essentials';
import { hasMyTicketsAgentSession, myTicketsFetchWithAuth } from './myTicketsFetchWithAuth';

export function fetchCurrentAppPlan(url: string): Promise<Response> {
    return hasMyTicketsAgentSession()
        ? myTicketsFetchWithAuth(url)
        : httpClient.fetchWithAuth(url);
}

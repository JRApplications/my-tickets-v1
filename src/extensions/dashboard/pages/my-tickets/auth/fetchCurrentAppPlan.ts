import { httpClient } from '@wix/essentials';
import { hasMyTicketsAgentSession, myTicketsFetchWithAuth } from './myTicketsFetchWithAuth';

export interface CurrentAppPlan {
    success: boolean;
    isSystemAdmin?: boolean;
    freeTrialActive?: boolean;
    freeTrialAvailable?: boolean;
    hasPlan?: boolean;
    isFreePlan?: boolean;
    planName?: string;
    upgradeUrl?: string;
    counts?: { agents: number; teams: number; chatConversations: number | null; tickets: number | null };
    limits?: { agents: number | null; teams: number | null; chatConversations: number | null; tickets: number | null };
    hasMaxAgents?: boolean;
    hasMaxTeams?: boolean;
    hasMaxChatConversations?: boolean;
    hasMaxTickets?: boolean;
    billingPeriod?: { startsAt: string; endsAt: string } | null;
}

export function fetchCurrentAppPlan(url: string): Promise<Response> {
    return hasMyTicketsAgentSession()
        ? myTicketsFetchWithAuth(url)
        : httpClient.fetchWithAuth(url);
}

import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { appInstances } from '@wix/app-management';
import { auth } from '@wix/essentials';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';
import wixConfig from '../../../../wix.config.json';

interface PlanLimits {
    agents: number | null;
    teams: number | null;
    chatConversations: number | null;
    tickets: number | null;
}

function getCurrentBillingPeriod(planStartedAt: string | undefined, now: Date): { start: Date; end: Date } | null {
    if (!planStartedAt) return null;
    const planStart = new Date(planStartedAt);
    if (!Number.isFinite(planStart.getTime()) || planStart > now) return null;

    let monthOffset = (now.getUTCFullYear() - planStart.getUTCFullYear()) * 12
        + now.getUTCMonth() - planStart.getUTCMonth();

    const anniversary = (offset: number): Date => {
        const absoluteMonth = planStart.getUTCFullYear() * 12 + planStart.getUTCMonth() + offset;
        const year = Math.floor(absoluteMonth / 12);
        const month = absoluteMonth - year * 12;
        const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const day = Math.min(planStart.getUTCDate(), lastDayOfMonth);
        return new Date(Date.UTC(
            year,
            month,
            day,
            planStart.getUTCHours(),
            planStart.getUTCMinutes(),
            planStart.getUTCSeconds(),
            planStart.getUTCMilliseconds(),
        ));
    };

    if (anniversary(monthOffset) > now) monthOffset -= 1;
    if (monthOffset < 0) return null;

    return { start: anniversary(monthOffset), end: anniversary(monthOffset + 1) };
}

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
    },
});

export const GET: APIRoute = async ({ request }) => {
    const authorization = request.headers.get('Authorization');
    if (!authorization) {
        return jsonResponse({ success: false, error: 'Wix dashboard access is required' }, 401);
    }

    let isAuthorized = false;
    try {
        isAuthorized = await checkPermission(authorization, ['USER']);
    } catch {
        return jsonResponse({ success: false, error: 'Wix dashboard access is required' }, 401);
    }
    if (!isAuthorized) {
        return jsonResponse({ success: false, error: 'Wix dashboard access is required' }, 403);
    }

    try {
        const getAppInstance = auth.elevate(appInstances.getAppInstance);
        const response = await getAppInstance();
        const instance = response.instance;
        const billing = instance?.billing;
        const packageName = billing?.packageName?.trim() || null;
        const normalizedPlanName = packageName?.toLowerCase() ?? '';
        const freeTrialStatus = billing?.freeTrialInfo?.status ?? null;
        const freeTrialActive = freeTrialStatus === 'IN_PROGRESS';
        const freeTrialAvailable = instance?.freeTrialAvailable === true;
        const hasPlan = instance?.isFree === false;
        const billingPeriod = getCurrentBillingPeriod(billing?.timeStamp, new Date());
        const queryItems = auth.elevate(items.query);
        const agentCountPromise = queryItems(CollectionIds.AGENTS).count({ consistentRead: true });
        const teamCountPromise = queryItems(CollectionIds.TEAMS).count({ consistentRead: true });
        const chatConversationCountPromise: Promise<number | null> = billingPeriod
            ? queryItems(CollectionIds.CHAT_CONVERSATIONS)
                .ge('_createdDate', billingPeriod.start)
                .count({ consistentRead: true })
            : Promise.resolve(null);
        const ticketCountPromise: Promise<number | null> = billingPeriod
            ? queryItems(CollectionIds.TICKETS)
                .ge('_createdDate', billingPeriod.start)
                .count({ consistentRead: true })
            : Promise.resolve(null);
        const [agentCount, teamCount, chatConversationCount, ticketCount] = await Promise.all([
            agentCountPromise,
            teamCountPromise,
            chatConversationCountPromise,
            ticketCountPromise,
        ]);

        const limits: PlanLimits | undefined = normalizedPlanName.includes('essential')
            ? { agents: 1, teams: 1, chatConversations: 100, tickets: 50 }
            : normalizedPlanName.includes('team')
                ? { agents: 5, teams: 5, chatConversations: 250, tickets: 150 }
                : normalizedPlanName.includes('advanced')
                    ? { agents: null, teams: null, chatConversations: null, tickets: null }
                    : undefined;
        const hasMaxAgents = limits?.agents !== null && limits?.agents !== undefined && agentCount >= limits.agents;
        const hasMaxTeams = limits?.teams !== null && limits?.teams !== undefined && teamCount >= limits.teams;
        const hasMaxChatConversations = limits?.chatConversations !== null
            && limits?.chatConversations !== undefined
            && chatConversationCount !== null
            && chatConversationCount >= limits.chatConversations;
        const hasMaxTickets = limits?.tickets !== null
            && limits?.tickets !== undefined
            && ticketCount !== null
            && ticketCount >= limits.tickets;
        const upgradeUrl = instance?.instanceId && wixConfig.appId
            ? `https://www.wix.com/apps/upgrade/${encodeURIComponent(wixConfig.appId)}?appInstanceId=${encodeURIComponent(instance.instanceId)}`
            : undefined;

        return jsonResponse({
            success: true,
            freeTrialActive,
            freeTrialAvailable,
            hasPlan,
            planName: packageName ?? undefined,
            upgradeUrl,
            counts: {
                agents: agentCount,
                teams: teamCount,
                chatConversations: chatConversationCount,
                tickets: ticketCount,
            },
            limits,
            hasMaxAgents,
            hasMaxTeams,
            hasMaxChatConversations,
            hasMaxTickets,
            billingPeriod: billingPeriod ? {
                startsAt: billingPeriod.start.toISOString(),
                endsAt: billingPeriod.end.toISOString(),
            } : null,
        });
    } catch (error) {
        console.error('Failed to retrieve the current Wix app plan', error);
        return jsonResponse({ success: false, error: 'Unable to retrieve the current app plan' }, 500);
    }
};

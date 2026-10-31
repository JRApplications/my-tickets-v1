import type { APIRoute } from 'astro';
import { appInstances } from '@wix/app-management';
import { auth } from '@wix/essentials';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';
import { generateElevatedAuthToken } from '../auth/generateElevatedAuthToken';
import { isSystemAdmin } from '../auth/system-admin';
import { HEADER_NAME, verifyToken } from './token';
import wixConfig from '../../../../wix.config.json';
import { getCalendarMonth, getPlanLimits, resolvePlanTier } from '../utils/plan-config';

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

async function fetchAppPlanCounts(accessToken: string, billingPeriod: { start: Date; end: Date } | null) {
    const periodFields = billingPeriod ? `
        chatConversations: dataItemsV2CountDataItems(input: $chatConversations) { totalCount }
        tickets: dataItemsV2CountDataItems(input: $tickets) { totalCount }
    ` : '';
    const periodVariableDefinitions = billingPeriod ? `
        $chatConversations: CloudDataDataCountDataItemsRequestInput,
        $tickets: CloudDataDataCountDataItemsRequestInput,
    ` : '';
    const periodVariables = billingPeriod ? {
        chatConversations: {
            dataCollectionId: CollectionIds.CHAT_CONVERSATIONS,
            filter: { _createdDate: { $gte: billingPeriod.start.toISOString() } },
        },
        tickets: {
            dataCollectionId: CollectionIds.TICKETS,
            filter: { _createdDate: { $gte: billingPeriod.start.toISOString() } },
        },
    } : {};
    const query = `
        mutation CountAppPlanDataItems(
            $agents: CloudDataDataCountDataItemsRequestInput,
            $teams: CloudDataDataCountDataItemsRequestInput,
            ${periodVariableDefinitions}
        ) {
            agents: dataItemsV2CountDataItems(input: $agents) { totalCount }
            teams: dataItemsV2CountDataItems(input: $teams) { totalCount }
            ${periodFields}
        }
    `;

    const response = await fetch('https://www.wixapis.com/graphql/alpha', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            query,
            variables: {
                agents: { dataCollectionId: CollectionIds.AGENTS },
                teams: { dataCollectionId: CollectionIds.TEAMS },
                ...periodVariables,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Wix GraphQL HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.errors?.length) {
        throw new Error(`Wix GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const data = result?.data;
    const agentCount = data?.agents?.totalCount;
    const teamCount = data?.teams?.totalCount;
    const chatConversationCount = billingPeriod ? data?.chatConversations?.totalCount : null;
    const ticketCount = billingPeriod ? data?.tickets?.totalCount : null;
    if (![agentCount, teamCount, ...(billingPeriod ? [chatConversationCount, ticketCount] : [])]
        .every((count) => typeof count === 'number' && Number.isFinite(count))) {
        throw new Error('Wix GraphQL returned invalid app plan counts');
    }

    return { agentCount, teamCount, chatConversationCount, ticketCount };
}

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
        let systemAdmin = false;
        const agentToken = request.headers.get(HEADER_NAME);
        if (agentToken) {
            try {
                const identity = await verifyToken(agentToken);
                systemAdmin = isSystemAdmin(identity.agentId);
            } catch {
                // Wix dashboard authorization still governs this endpoint. An
                // invalid optional agent token must not grant elevated plan access.
            }
        }
        const tier = systemAdmin ? 'advanced' : resolvePlanTier(packageName, instance?.isFree);
        const isFreePlan = tier === 'free';
        const effectivePlanName = systemAdmin ? 'Advanced' : isFreePlan ? 'Free' : packageName;
        const freeTrialStatus = billing?.freeTrialInfo?.status ?? null;
        const freeTrialActive = freeTrialStatus === 'IN_PROGRESS';
        const freeTrialAvailable = instance?.freeTrialAvailable === true;
        const hasPlan = systemAdmin || instance?.isFree === false || isFreePlan;
        const billingPeriod = isFreePlan
            ? getCalendarMonth(new Date())
            : getCurrentBillingPeriod(billing?.timeStamp, new Date());
        const accessToken = await generateElevatedAuthToken(authorization);
        const { agentCount, teamCount, chatConversationCount, ticketCount } =
            await fetchAppPlanCounts(accessToken, billingPeriod);

        const limits: PlanLimits | undefined = getPlanLimits(tier);
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
            isSystemAdmin: systemAdmin,
            freeTrialActive,
            freeTrialAvailable,
            hasPlan,
            isFreePlan,
            planName: effectivePlanName ?? undefined,
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

import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { appInstances } from '@wix/app-management';
import { auth } from '@wix/essentials';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';
import wixConfig from '../../../../wix.config.json';

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
        const countItems = auth.elevate(items.count);
        const [agentCount, teamCount] = await Promise.all([
            countItems(CollectionIds.AGENTS),
            countItems(CollectionIds.TEAMS),
        ]);

        const limits = normalizedPlanName.includes('essential')
            ? { agents: 1, teams: 1 }
            : normalizedPlanName.includes('team')
                ? { agents: 5, teams: 5 }
                : normalizedPlanName.includes('advanced')
                    ? { agents: null, teams: null }
                    : undefined;
        const hasMaxAgents = limits?.agents !== null && limits?.agents !== undefined && agentCount >= limits.agents;
        const hasMaxTeams = limits?.teams !== null && limits?.teams !== undefined && teamCount >= limits.teams;
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
            counts: { agents: agentCount, teams: teamCount },
            limits,
            hasMaxAgents,
            hasMaxTeams,
        });
    } catch (error) {
        console.error('Failed to retrieve the current Wix app plan', error);
        return jsonResponse({ success: false, error: 'Unable to retrieve the current app plan' }, 500);
    }
};

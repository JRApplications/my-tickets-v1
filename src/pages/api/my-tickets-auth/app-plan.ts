import type { APIRoute } from 'astro';
import { appInstances } from '@wix/app-management';
import { auth } from '@wix/essentials';
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
        const freeTrialStatus = billing?.freeTrialInfo?.status ?? null;
        const freeTrialActive = freeTrialStatus === 'IN_PROGRESS';
        const freeTrialAvailable = instance?.freeTrialAvailable === true;
        const hasPlan = instance?.isFree === false;
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
        });
    } catch (error) {
        console.error('Failed to retrieve the current Wix app plan', error);
        return jsonResponse({ success: false, error: 'Unable to retrieve the current app plan' }, 500);
    }
};

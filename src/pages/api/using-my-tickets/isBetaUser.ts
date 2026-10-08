import type { APIRoute } from 'astro';
import { auth } from '@wix/essentials';
import { appInstances } from '@wix/app-management';
import { captureError } from './../reportError';

import { BASE_44_MY_TICKETS_BACKEND_MANAGER } from "astro:env/server";

export const GET: APIRoute = async ({ request,locals }) => {
    try {
        const siteId = await getSiteId();
        const response = await fetch(`https://app.base44.com/api/apps/6ab30e3df51d30247532f059/entities/BetaUser?site_id=${siteId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${BASE_44_MY_TICKETS_BACKEND_MANAGER}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        const isBetaUser = data[0]?.enabled_features ? true : false;
        const betaFeatures = data[0]?.enabled_features ?? [];

        return new Response(JSON.stringify({ success: true, isBetaUser, betaFeatures }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, message: (error as Error).message, requestId }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

const getSiteId = async () => {
    try {
        const elevatedGetAppInstance = auth.elevate(appInstances.getAppInstance);
        const response = await elevatedGetAppInstance();
        const siteId = response?.site?.siteId;
        if (!siteId) {
            throw new Error('Site ID not found');
        }
        return siteId;
    } catch (error) {
        console.error('Failed to get site ID:', error);
        return 'THE_SITE_ID';
    }
};

import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { captureError } from '../reportError';
import { isSystemAdmin } from '../auth/system-admin';
import { auth } from '@wix/essentials';

export const GET: APIRoute = async ({ request, locals }) => {
    try {
        const identity = locals.myTicketsIdentity;
        const teamId = identity?.teamId;
        if (!teamId) {
            return new Response(JSON.stringify({ success: false, error: 'Missing teamId' }), { status: 400 });
        }

        let query = auth.elevate(items.query)(CollectionIds.CHAT_CONVERSATIONS).eq('channel', 'SITE_LIVE_CHAT');
        if (!isSystemAdmin(identity?.agentId)) query = query.eq('metaData.currentTeamId', teamId);
        const sidebarItems = await query.fields('metaData').find();
        const mappedSidebarItems = sidebarItems.items.map(item => {
            return {
                _id: item._id,
                siteUserName: item.metaData.siteUserName,
                siteUserType: item.metaData.siteUserType,
                status: item.metaData.status,
            };
        });

        return new Response(JSON.stringify({ success: true, chats: mappedSidebarItems }), { status: 200 });

    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        console.error("Failed to fetch sidebar items", error);
        return new Response(JSON.stringify({ success: false, error: 'Failed to fetch sidebar items', requestId }), { status: 500, headers: { 'x-mytickets-request-id': requestId } });
    }
}

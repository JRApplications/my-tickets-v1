import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { auth } from '@wix/essentials';
import { publisher } from '@wix/realtime';
import { isSystemAdmin } from '../auth/system-admin';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const body = await request.json();
        const { agentId, notification } = body;

        if (!agentId || !notification) {
            status = 400;
            throw new Error('Missing agentId or notification');
        }
        if (isSystemAdmin(agentId)) {
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }

        await insertNotification(agentId, notification);
        await sendRealtimeNotification(agentId, notification);

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error sending notification' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

const insertNotification = async (agentId: string, notification: any) => {
    try {
        const inserted = await items.patch(CollectionIds.AGENTS, agentId).appendToArray('notifications', notification).run();
        return inserted;
    } catch (error) {
        throw new Error('Failed to insert notification');
    }
};

const sendRealtimeNotification = async (agentId: string, notification: any) => {
    try {
        const elevatedPublish = auth.elevate(publisher.publish);
        const result = await elevatedPublish({ name: 'AGENT_NOTIFICATIONS', resourceId: agentId }, { notification });
        return result;
    } catch (error) {
        throw new Error('Failed to send real-time notification');
    }
};

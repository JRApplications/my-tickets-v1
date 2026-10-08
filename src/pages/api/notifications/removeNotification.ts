import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { isSystemAdmin } from '../auth/system-admin';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const { notificationId } = await request.json();
        const agentId = locals.myTicketsIdentity?.agentId;
        if (!notificationId || !agentId) {
            status = 400;
            throw new Error('Missing notificationId or agentId');
        }
        if (isSystemAdmin(agentId)) {
            return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        const item = await items.get(CollectionIds.AGENTS, agentId, { consistentRead: true, fields: ['notifications'] });
        if (!item) {
            status = 404;
            throw new Error('Agent not found');
        }
        const notificationObjectToRemove = item.notifications.find((n: any) => n.id === notificationId);
        if (!notificationObjectToRemove) {
            status = 404;
            throw new Error('Notification not found');
        }
        const result = await items.patch(CollectionIds.AGENTS, agentId).removeFromArray('notifications', notificationObjectToRemove).run();
        if (!result) {
            status = 404;
            throw new Error('Notification not found');
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error removing notification' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

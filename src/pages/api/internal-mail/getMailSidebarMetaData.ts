import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { CollectionIds } from "@jrapps/my_tickets_common_types";
import { isSystemAdmin } from '../auth/system-admin';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const mailId = new URL(request.url).searchParams.get('mailId');
        const user = locals.myTicketsIdentity?.agentId;
        const authToken = request.headers.get('Authorization');
        const checkPermission1 = await checkPermission(authToken, ["ADMIN", "USER"]);
        if (!checkPermission1) {
            status = 403;
            throw new Error('Insufficient permissions');
        }

        if (!user) {
            status = 400;
            throw new Error('Missing agent parameter');
        }

        if (!mailId) {
            status = 400;
            throw new Error('Missing mailId parameter');
        }

        const elevatedGet = auth.elevate(items.get);
        const item = await elevatedGet(CollectionIds.CHAT_CONVERSATIONS, mailId, { consistentRead: true });

        if (!item) {
            status = 404;
            throw new Error('Mail item not found');
        }

        const systemAdmin = isSystemAdmin(user);
        const hasRead = systemAdmin || item.metaData.agentsRead.includes(user);
        const isFlagged = !systemAdmin && item.metaData.agentsFlagged.includes(user);

        const formattedMailItem = {
            _id: item._id,
            from: item.metaData.agentFrom.name,
            originalSent: item.metaData.agentFrom._id === user,
            to: item.metaData.agentsTo,
            subject: item.metaData.subject,
            hasRead,
            isFlagged,
            timestamp: new Date(item._updatedDate as Date),
        };

        return new Response(JSON.stringify({ item: formattedMailItem }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'An error occurred while fetching the mail item' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

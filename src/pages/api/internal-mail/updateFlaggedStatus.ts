import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { CollectionIds } from "@jrapps/my_tickets_common_types"; 

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const data = await request.json();
        const { isRemoving, isAdding, agentId, mailId } = data;
        const authToken = request.headers.get('Authorization');
        const checkPermission1 = await checkPermission(authToken, ["ADMIN", "USER"]);
        if (!checkPermission1) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        if (!agentId || !mailId) {
            status = 400;
            throw new Error('Missing agentId or mailId parameter');
        }
        const elevatedPatch = auth.elevate(items.patch);

        if (isRemoving && !isAdding) {
            const updatedItem = await elevatedPatch(CollectionIds.CHAT_CONVERSATIONS, mailId)
                .removeFromArray('metaData.agentsFlagged', agentId)
                .run();
            if (!updatedItem) {
                status = 500;
                throw new Error('Failed to remove flagged status');
            }
            const itemToReturn = await getUpdatedItem(mailId, agentId);
            if (!itemToReturn) {
                status = 500;
                throw new Error('Failed to fetch updated item after removing flagged status');
            }
            return new Response(JSON.stringify({ success: true, item: itemToReturn }), { status: 200 });
        } else if (isAdding && !isRemoving) {
            const updatedItem = await elevatedPatch(CollectionIds.CHAT_CONVERSATIONS, mailId)
                .appendToArray('metaData.agentsFlagged', agentId)
                .run();
            if (!updatedItem) {
                status = 500;
                throw new Error('Failed to add flagged status');
            }
            const itemToReturn = await getUpdatedItem(mailId, agentId);
            if (!itemToReturn) {
                status = 500;
                throw new Error('Failed to fetch updated item after adding flagged status');
            }
            return new Response(JSON.stringify({ success: true, item: itemToReturn }), { status: 200 });
        } else {
            status = 400;
            throw new Error('Invalid request: must specify either isRemoving or isAdding');
        }
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'An error occurred while updating flagged status' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
}

const getUpdatedItem = async (mailId: string, agentId: string) => {
    try {
        const elevatedGet = auth.elevate(items.get);
        const item = await elevatedGet(CollectionIds.CHAT_CONVERSATIONS, mailId, { fields: ['_id', '_updatedDate', 'metaData'] });
        return {
            _id: item?._id,
            from: item?.metaData.agentFrom.name,
            originalSent: item?.metaData.agentFrom._id === agentId,
            to: item?.metaData.agentsTo,
            subject: item?.metaData.subject,
            hasRead: item?.metaData.agentsRead.includes(agentId),
            isFlagged: item?.metaData.agentsFlagged.includes(agentId),
            timestamp: new Date(item?._updatedDate as Date),
        }
    } catch (error: any) {
        throw new Error(error.message);
    }
}

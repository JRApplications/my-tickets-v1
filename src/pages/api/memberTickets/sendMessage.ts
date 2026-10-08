import type { APIRoute } from 'astro';
import { members } from "@wix/members";
import { captureError } from '../reportError';
import { items } from "@wix/data";
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@wix/essentials';
import { checkPermission } from '../auth/checkPermission';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { markSlaNextResponse, runSlaHook } from '../utils/slaServer';

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const { ticketId, message } = await request.json();

        if (!ticketId || !message) {
            status = 400;
            throw new Error('ticketId and message are required');
        }

        const authToken = request.headers.get('Authorization');
        const permitted = await checkPermission(authToken, ["MEMBER"]);

        if (!permitted) {
            status = 403;
            throw new Error('Insufficient Permissions');
        }

        const { isMember, memberName, memberId } = await VerifyMember(ticketId);
        if (!isMember) {
            status = 403;
            throw new Error('Member not authorized for this ticket');
        }

        const objectToInsert = {
            "timestamp": Date.now(),
            "message": message,
            "senderType": "user",
            "senderName": memberName,
            "senderId": memberId,
            "ticketId": ticketId,
            "_id": uuidv4()
        }

        const elevatedPatch = auth.elevate(items.patch);
        const patched = await elevatedPatch(CollectionIds.TICKETS, ticketId).appendToArray('communication', objectToInsert).run();
        if (!patched) {
            status = 500;
            throw new Error('Failed to update ticket communication');
        }
        await runSlaHook(() => markSlaNextResponse(ticketId, objectToInsert.timestamp));

        return new Response(JSON.stringify({ success: true, message: objectToInsert }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: error.message, requestId }), {
            status,
            headers: { "Content-Type": "application/json", "x-mytickets-request-id": requestId },
        });
    }
};

const VerifyMember = async (ticketId: string): Promise<{ isMember: boolean, memberName: string, memberId: string }> => {
    try {
        const member = await members.getCurrentMember({ fieldsets: ['FULL'] });
        if (!member) {
            throw new Error('Member not found');
        }
        const memberId = member?.member?._id;
        if (!memberId) {
            throw new Error('Member ID not found');
        }
        const memberName = `${member?.member?.contact?.firstName || ''} ${member?.member?.contact?.lastName || ''}`.trim();
        const elevatedGet = auth.elevate(items.get);
        const ticket = await elevatedGet(CollectionIds.TICKETS, ticketId);
        if (!ticket) {
            throw new Error('Ticket not found');
        }

        if (ticket.memberId !== memberId) {
            throw new Error('Member not authorized for this ticket');
        }

        return {
            isMember: true,
            memberName: memberName,
            memberId: memberId
        };
    } catch (error: any) {
        throw error;
    }
}
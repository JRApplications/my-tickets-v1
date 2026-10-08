import type { APIRoute } from 'astro';
import { items } from '@wix/data'
import { captureError } from '../../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../../auth/checkPermission';
import { members } from '@wix/members';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        const url = new URL(request.url);
        const query = url.searchParams.get('query');
        const teamId = url.searchParams.get('teamId');

        if (!query || !teamId) {
            status = 400;
            throw new Error('Query and team ID are required');
        }

        const boundedQuery = query.trim().slice(0, 100);
        if (!boundedQuery) {
            status = 400;
            throw new Error('Query is required');
        }
        const memberSearch = await members.queryMembers({
            fieldsets: [members.Set.FULL],
            search: {
                expression: boundedQuery,
                fields: ['loginEmail', 'contact.firstName', 'contact.lastName', 'profile.nickname'],
            },
        }).find();

        let searchFilter = items.filter()
            .eq('primaryTicketNumber', boundedQuery)
            .or(items.filter().contains('memberName', boundedQuery))
            .or(items.filter().contains('subject', boundedQuery));
        for (const member of memberSearch.items) {
            searchFilter = searchFilter.or(items.filter().eq('memberId', member._id));
        }
        let ticketSearch = items.query(CollectionIds.TICKETS);
        if (teamId !== 'system_admin') ticketSearch = ticketSearch.eq('teamId', teamId);
        ticketSearch = ticketSearch.and(searchFilter);

        let allItems: any[] = [];
        let results = await ticketSearch
            .fields('_id', 'primaryTicketNumber', 'subject', 'priority', 'status', 'assignedAgent', 'assignedTeam', 'tags', 'isSpam', 'isDeleted', 'sla')
            .limit(1000)
            .descending('primaryTicketNumber')
            .find({ returnTotalCount: false });

        allItems = allItems.concat(results.items);

        while (results.hasNext()) {
            results = await results.next();
            allItems = allItems.concat(results.items);
        }
        return new Response(JSON.stringify({
            success: true,
            tickets: allItems.map((item) => ({
                _id: item._id,
                primaryTicketId: item.primaryTicketNumber,
                subject: item.subject,
                priority: item.priority,
                status: item.status,
                assignedAgent: item.assignedAgent,
                assignedTeam: item.assignedTeam,
                tags: item.tags || [],
                isSpam: item.isSpam === true,
                isDeleted: item.isDeleted === true,
                sla: item.sla,
            }))
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error getting ticket' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

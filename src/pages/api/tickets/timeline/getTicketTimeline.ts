import type { APIRoute } from "astro";
import { items } from '@wix/data';
import { CollectionIds, type TimelineMessage } from "@jrapps/my_tickets_common_types";
import { captureError } from '../../reportError';

interface TicketTimelineItem {
    label: string; // The label or description of the timeline item
    suffix: string; // The suffix or additional information for the timeline item aka the data / time
}

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    const url = new URL(request.url);
    const ticketId = url.searchParams.get('id');

    if (!ticketId) {
        return new Response(JSON.stringify({ success: false, error: 'Missing id' }), {
            status: 400,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }

    try {
        const ticket = await items.get(CollectionIds.TICKETS, ticketId, {fields: ['timeline']});
        const formattedTimeline = formatTicketTimelineItems(ticket?.timeline as Array<TimelineMessage> || []);
        return new Response(JSON.stringify({ success: true, timeline: formattedTimeline }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            }
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to retrieve ticket timeline' }), {
            status: status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            }
        });
    }
};

const formatTicketTimelineItems = (items: Array<TimelineMessage>): Array<TicketTimelineItem> => {
    return items.map((item: TimelineMessage) => ({
        label: item.message,
        suffix: formatTimestamp(item.timestamp as any),
    }));
};

const formatTimestamp = (timestamp: any): string => {
    // returns long day - short month - year - hours:minutes & am / pm
    const date = new Date(timestamp);
    const dayName = date.toLocaleString('default', { weekday: 'long' });
    const dayNumber = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear().toString();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');
    return `${dayName} ${dayNumber} ${month} ${year} - ${formattedHours}:${minutes} ${ampm}`;
};
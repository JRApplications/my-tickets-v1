import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { captureError } from '../reportError';

interface ValidateResponse {
    canMerge: boolean;
    errors: string[];
    warnings: string[];
}

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;

    try {
        const url = new URL(request.url);
        const ticketId1 = url.searchParams.get('ticketId1');
        const ticketId2 = url.searchParams.get('ticketId2');

        if (!ticketId1 || !ticketId2) {
            return new Response(JSON.stringify({ 
                canMerge: false,
                errors: ['Both ticketId1 and ticketId2 are required'],
                warnings: []
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const { errors, warnings } = await validateMerge(ticketId1, ticketId2);

        const response: ValidateResponse = {
            canMerge: errors.length === 0,
            errors,
            warnings
        };

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ 
            canMerge: false,
            errors: ['Error validating merge'], 
            warnings: []
        }), {
            status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
}

// ============ VALIDATION LOGIC ============

const validateMerge = async (ticketId1: string, ticketId2: string): Promise<{ errors: string[], warnings: string[] }> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if IDs are the same
    if (ticketId1 === ticketId2) {
        errors.push('Cannot merge a ticket with itself');
        return { errors, warnings };
    }

    // Fetch tickets
    let ticket1, ticket2;
    try {
        ticket1 = await items.get(CollectionIds.TICKETS, ticketId1);
        ticket2 = await items.get(CollectionIds.TICKETS, ticketId2);
    } catch (error: any) {
        errors.push('Error retrieving one or both tickets');
        return { errors, warnings };
    }

    // Check if tickets exist
    if (!ticket1) {
        errors.push('First ticket not found');
    }

    if (!ticket2) {
        errors.push('Second ticket not found');
    }

    if (errors.length > 0) {
        return { errors, warnings };
    }

    // Check if already merged
    if (ticket1?.mergeSummary) {
        errors.push('First ticket has already been merged');
    }

    if (ticket2?.mergeSummary) {
        errors.push('Second ticket has already been merged');
    }

    // Check if tickets belong to same customer
    if (ticket1?.memberId !== ticket2?.memberId) {
        errors.push(`Tickets belong to different customers: ${ticket1?.memberName} vs ${ticket2?.memberName}`);
    }

    // Warning: both tickets closed/resolved
    if ((ticket1?.status === 'closed' || ticket1?.status === 'resolved') &&
        (ticket2?.status === 'closed' || ticket2?.status === 'resolved')) {
        errors.push('Cannot merge two tickets that are both closed or resolved');
    }

    // Warning: ticket already has many messages
    const total1 = (ticket1?.communication?.length || 0) + (ticket1?.internalNotes?.length || 0);
    const total2 = (ticket2?.communication?.length || 0) + (ticket2?.internalNotes?.length || 0);
    
    if (total1 + total2 > 100) {
        warnings.push(`Merging will create a ticket with ${total1 + total2} total messages/notes - consider archiving before merge`);
    }

    // Warning: different priorities
    if (ticket1?.priority !== ticket2?.priority) {
        warnings.push(`Tickets have different priorities: ${ticket1?.priority} vs ${ticket2?.priority}`);
    }

    return { errors, warnings };
}

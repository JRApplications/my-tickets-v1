import type { TicketStatus } from '@jrapps/my_tickets_common_types';

export const formatStatus = (status: TicketStatus): string => {
    switch (status) {
        case 'open':
            return 'Open';
        case 'closed':
            return 'Closed';
        case 'resolved':
            return 'Resolved';
        case 'in_progress':
            return 'In Progress';
        default:
            return status;
    }
}
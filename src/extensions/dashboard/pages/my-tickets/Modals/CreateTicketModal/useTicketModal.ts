import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { dashboard } from '@wix/dashboard';
import { ExtensionIds, type CreateTicketPayload } from '@jrapps/my_tickets_common_types';

const baseApiUrl = new URL(import.meta.url).origin;


export interface Team {
    _id: string;
    name: string;
}

export interface CreateTicketResponse {
    ticket?: any;
    error?: string;
}

export const teams = async (): Promise<Team[]> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/teams/get`);
    const data = await response.json();
    return data.teams || [];
};

export const createTicket = async (ticketData: CreateTicketPayload): Promise<CreateTicketResponse> => {

    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/createTicket`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(ticketData),
    });
    const data = await response.json();
    return data;
};

export const getRelatedTickets = async (tags: string[]): Promise<any> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/getRelatedTickets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tags }),
    });
    const data = await response.json();
    return data;
};

export const openRelatedTicket = async (ticketId: string): Promise<any> => {
    try {
        const pageUrl = await dashboard.getPageUrl({
            pageId: ExtensionIds.DASHBOARD_PAGE,
            relativeUrl: `?stateOverride=view-tickets&ticketId=${ticketId}&devOverride=agent1`,
        });
        // open the page url in a new tab
        window.open(pageUrl, '_blank');
    } catch (error) {
        console.error('Failed to open related ticket:', error);
        throw error;
    }
};
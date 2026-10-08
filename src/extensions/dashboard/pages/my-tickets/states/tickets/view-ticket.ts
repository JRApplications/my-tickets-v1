import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import type { Ticket } from '@jrapps/my_tickets_common_types';

const baseApiUrl = new URL(import.meta.url).origin;

export interface TicketDetails {
    memberName: string;
    memberId: string;
    communication: any[];
    status: string;
    priority: string;
    internalNotes?: any[];
    subject: string;
    assignees: string;
    teamName: string;
    primaryTeamName: string;
    _createdDate: string;
    _updatedDate: string;
    primaryTicketNumber: string;
    assignee: string;
}

export interface AgentNameResponse {
    name: string;
    error: string;
}

export interface SendMessagePayload {
    ticketId: string;
    message: string;
    attachment: Array<{ id: string; name: string; url: string }>;
    agentId: string;
    agentName: string;
    messageType: string;
}


export const fetchTicketTimeline = async (ticketId: string): Promise<any[]> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/timeline/getTicketTimeline?id=${ticketId}`);
    const { timeline, error } = await response.json();
    if (!response.ok) {
        console.error(error)
        ShowToast({message: error, type: 'error'});
    }
    return timeline || [];
};

export const fetchTicketDetails = async (ticketId: string): Promise<Ticket> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/getTicketById?id=${ticketId}`);
    const { ticket, error } = await response.json();
    if (!ticket) {
        console.error(error)
        ShowToast({message: error, type: 'error'});
    }
    return ticket;
};

export const fetchAgentName = async (agentId: string): Promise<string> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/agents/getAgentName?id=${agentId}`, {
        method: 'GET',
    });
    const data: AgentNameResponse = await response.json();
    if (!response.ok) {
        console.error(data.error)
        ShowToast({message: data.error, type: 'error'});
    }
    return data.name;
};

export const sendTicketMessage = async (payload: SendMessagePayload): Promise<any> => {
    const res = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/sendMessage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
        console.error(data.error)
        ShowToast({message: data.error, type: 'error'});
    }
    return data;
};

export const sendInternalNote = async (payload: SendMessagePayload): Promise<any> => {
    const res = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/internal-note/send-message`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
        console.error(data.error)
        ShowToast({message: data.error, type: 'error'});
    }
    return data;
};

export const updateTicketTags = async (ticketId: string, tags: string[], agentId: string, agentName: string): Promise<string[]> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/updateTags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, tags, agentId, agentName }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to update ticket tags');
    return data.tags || [];
};

export const updateTicketDisposition = async (ticketId: string, action: 'spam' | 'delete' | 'restore', agentId: string, agentName: string): Promise<{ isSpam: boolean; isDeleted: boolean }> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/updateDisposition`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, action, agentId, agentName }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to update ticket');
    return { isSpam: data.isSpam, isDeleted: data.isDeleted };
};

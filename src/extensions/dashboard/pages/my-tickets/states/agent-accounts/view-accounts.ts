import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import type { Agent } from '@jrapps/my_tickets_common_types';

const baseApiUrl = new URL(import.meta.url).origin;


export const fetchAgents = async (): Promise<Agent[]> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/agents/get`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error);
    }
    return result.agents || [];
};

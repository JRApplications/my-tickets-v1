import { getWixServerBaseUrl } from '../../../../../api-url';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import type { Agent } from '@jrapps/my_tickets_common_types';

const baseApiUrl = getWixServerBaseUrl(import.meta.url);


export const fetchAgents = async (): Promise<Agent[]> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/agents/get`, {
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

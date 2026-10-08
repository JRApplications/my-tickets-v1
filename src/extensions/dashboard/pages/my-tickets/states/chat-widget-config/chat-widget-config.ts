import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import type { TeamOption, Config } from './chat-widget-config.types';

const baseApiUrl = new URL(import.meta.url).origin;

export const fetchTeams = async (): Promise<TeamOption[]> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/teams/get`);
    const data = await response.json();
    if (response.ok && data.success && Array.isArray(data.teams)) {
        return data.teams.map((team: TeamOption) => ({
            _id: team?._id,
            name: team?.name
        }))
    }
    return [];
};

export const fetchChatWidgetConfig = async (): Promise<Config> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/chat-settings/get?dashboard=true`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch chat configuration');
    }
    
    return data.data;;
};

export const saveChatWidgetConfig = async (config: Config): Promise<{ _id: string; config: Config; success: boolean }> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/chat-settings/config`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error);
    }
    if (!data.success) {
        throw new Error(data.error);
    }
    return data;
};

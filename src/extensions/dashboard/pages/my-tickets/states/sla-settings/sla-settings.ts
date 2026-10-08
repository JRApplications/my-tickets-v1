import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import type { SlaSettings } from '@jrapps/my_tickets_common_types';

const baseApiUrl = new URL(import.meta.url).origin;

export interface TeamOption {
    _id: string;
    name: string;
}

export const fetchSlaSettings = async (): Promise<SlaSettings> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/sla-settings/get`);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load SLA settings');
    return data.settings;
};

export const saveSlaSettings = async (settings: SlaSettings): Promise<SlaSettings> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/sla-settings/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save SLA settings');
    return data.settings;
};

export const fetchTeams = async (): Promise<TeamOption[]> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/teams/get`);
    const data = await response.json();
    if (response.ok && data.success && Array.isArray(data.teams)) {
        return data.teams.map((team: TeamOption) => ({ _id: team._id, name: team.name }));
    }
    return [];
};

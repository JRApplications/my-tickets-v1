import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
interface TeamData {
    _id: string;
    name?: string;
    description?: string;
    department?: string;
    teamPictureUrl?: string;
}

const baseApiUrl = new URL(import.meta.url).origin;

export const fetchTeams = async (): Promise<TeamData[]> => {
    const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/teams/get`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error);
    }
    return (result.teams || []).map((team: any) => ({
        ...team,
        description: team.description || '',
    }));
};

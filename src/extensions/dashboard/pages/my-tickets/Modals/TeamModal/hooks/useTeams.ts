import { myTicketsFetchWithAuth } from '../../../auth/myTicketsFetchWithAuth';
import { useState } from 'react';

const useTeams = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const getTeamData = async (teamId: string) => {
        setIsLoading(true);
        try {
            if (!teamId) {
                throw new Error('Team ID is required to fetch team data.');
            }
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/teams/get?id=${encodeURIComponent(teamId)}`);
            const data = await response.json();
            if (!response.ok || !data?.success || !data.team) throw new Error('Failed to load team');
            setIsError(false);
            return { ...data.team, email: (data.team.email || '').replace(/@mytickets\.internal$/i, '') };
        } catch (error) {
            console.error(`Failed to fetch team data for teamId ${teamId}:`, error);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const updateTeamData = async (teamId: string, teamData: Record<string, any>): Promise<{ success: boolean }> => {
        setIsLoading(true);
        setIsCreating(true);
        try {
            if (!teamId) {
                throw new Error('Team ID is required to update team data.');
            }
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/teams/update?id=${teamId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(teamData),
            });
            const data = await response.json();
            if (!response.ok || data?.success === false) throw new Error('Team update failed');
            setIsError(false);
            return { success: data?.success !== false };
        } catch (error) {
            console.error(`Failed to update team data for teamId ${teamId}:`, error);
            setIsError(false);
            return { success: false };
        } finally {
            setIsLoading(false);
            setIsCreating(false);
        }
    };

    const createTeam = async (teamData: Record<string, any>): Promise<{ success: boolean }> => {
        setIsCreating(true);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/teams/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(teamData),
            });
            const data = await response.json();
            if (!response.ok || data?.success === false) throw new Error('Team creation failed');
            setIsError(false);
            return { success: data?.success !== false };
        } catch (error) {
            console.error('Failed to create team:', error);
            setIsError(false);
            return { success: false };
        } finally {
            setIsCreating(false);
        }
    };

    return {
        getTeamData,
        updateTeamData,
        createTeam,
        isLoading,
        isError,
        isCreating,
    };
};

export default useTeams;

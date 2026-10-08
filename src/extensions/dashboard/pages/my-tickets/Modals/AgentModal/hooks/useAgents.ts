import { myTicketsFetchWithAuth } from '../../../auth/myTicketsFetchWithAuth';
import { useEffect, useState } from 'react';

const useAgents = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isOptionsLoading, setIsOptionsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [roles, setRoles] = useState<{ value: string; id: string }[]>([]);
    const [teams, setTeams] = useState<{ value: string; id: string }[]>([]);

    const baseApiUrl = new URL(import.meta.url).origin;

    const getAgentData = async (agentId: string) => {
        setIsLoading(true);
        try {
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/agents/get?id=${encodeURIComponent(agentId)}`);
            const data = await response.json();
            if (!response.ok || !data?.success || !data.user) throw new Error('Failed to load agent');
            setIsError(false);
            return data.user;
        } catch (error) {
            console.error(`Failed to fetch agent data for agentId ${agentId}:`, error);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const updateAgentData = async (agentId: string, agentData: Record<string, any>): Promise<{ success: boolean }> => {
        setIsLoading(true);
        try {
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/agents/update?id=${encodeURIComponent(agentId)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(agentData),
            });
            const data = await response.json();
            const success = response.ok && data?.success === true;
            setIsError(false);
            return { success };
        } catch (error) {
            console.error(`Failed to update agent data for agentId ${agentId}:`, error);
            setIsError(false);
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    };

    const createAgent = async (agentData: any): Promise<{ success: boolean }> => {
        setIsLoading(true);
        try {
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/agents/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(agentData),
            });
            const data = await response.json();
            if (response.ok && data.success === true) {
                setIsError(false);
            } else setIsError(false);
            return { success: response.ok && data.success === true };
        } catch (error) {
            console.error('Failed to create agent:', error);
            setIsError(false);
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const loadRoles = async () => {
            try {
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/roles/get`);
                const data = await response.json();
                const result = data.roles;
                if (response.ok && data.success && Array.isArray(result)) {
                    setRoles(result.map((role: any) => ({ value: role.roleName, id: role._id })));
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Failed to fetch roles:', error);
                return false;
            }
        };

        const loadTeams = async () => {
            try {
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/teams/get`);
                const data = await response.json();
                const result = data.teams;
                if (response.ok && data.success && Array.isArray(result)) {
                    setTeams(result.map((team: any) => ({ value: team.name, id: team._id })));
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Failed to fetch teams:', error);
                return false;
            }
        };

        Promise.all([loadRoles(), loadTeams()]).then(([rolesLoaded, teamsLoaded]) => {
            setIsError(!rolesLoaded || !teamsLoaded);
            setIsOptionsLoading(false);
        });
    }, [baseApiUrl]);

    return {
        getAgentData,
        updateAgentData,
        createAgent,
        roles,
        teams,
        isLoading: isLoading || isOptionsLoading,
        isError,
    };
};

export default useAgents;

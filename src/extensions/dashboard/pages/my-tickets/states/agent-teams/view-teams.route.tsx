import { useState, useEffect } from 'react';

//  import type { TeamData } from '../../../my-tickets.types';
interface TeamData {
    _id: string;
    name?: string;
    description?: string;
    teamPictureUrl?: string;
}
import ViewTeamsWrapper from './view-teams.wrapper';
import { fetchTeams } from './view-teams';

import type { ViewTeamsProps } from './teams.types';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';

const teamsCache = new Map<string, TeamData[]>();
const CACHE_KEY = 'teams';

const ViewTeams = ({ permissions, onModalOpen }: ViewTeamsProps) => {
    const [data, setData] = useState<TeamData[]>(() => teamsCache.get(CACHE_KEY) ?? []);
    const [isLoading, setIsLoading] = useState<boolean>(() => !teamsCache.get(CACHE_KEY));
    const [isError, setIsError] = useState<boolean>(false);

    useEffect(() => {
        const loadTeams = async () => {
            setIsError(false);

            const cached = teamsCache.get(CACHE_KEY);
            if (cached) {
                setData(cached);
            } else {
                setIsLoading(true);
            }

            try {
                const fresh = await fetchTeams();
                teamsCache.set(CACHE_KEY, fresh);
                setData(fresh);
            } catch (error: any) {
                console.error(error.message)
                ShowToast({message: error.message, type: 'error'});
                if (!teamsCache.has(CACHE_KEY)) {
                    setIsError(true);
                    ShowToast({message: 'Failed to load teams. Please try again.', type: 'error'});
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadTeams();
    }, []);

    return <ViewTeamsWrapper data={data} permissions={permissions} isLoading={isLoading} isError={isError} onModalOpen={onModalOpen} />;
}

export default ViewTeams;
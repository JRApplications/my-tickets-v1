import { useState, useEffect } from 'react';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';

import ViewAccountsWrapper from './view-accounts.wrapper';
import { fetchAgents } from './view-accounts';

import type { ViewAccountsProps } from './accounts.types';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import type { Agent } from '@jrapps/my_tickets_common_types';


const accountsCache = new Map<string, Agent[]>();
const CACHE_KEY = 'accounts';

const ViewAccounts = ({ permissions, onModalOpen }: ViewAccountsProps) => {
    const [data, setData] = useState<Agent[]>(() => accountsCache.get(CACHE_KEY) ?? []);
    const [isLoading, setIsLoading] = useState(() => !accountsCache.get(CACHE_KEY));
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsError(false);

            const cached = accountsCache.get(CACHE_KEY);
            if (cached) {
                setData(cached);
            } else {
                setIsLoading(true);
            }

            try {
                const fresh = await fetchAgents();
                accountsCache.set(CACHE_KEY, fresh);
                setData(fresh);
            } catch (error: any) {
                console.error("Error fetching users:", error.message);
                if (!accountsCache.has(CACHE_KEY)) {
                    setIsError(true);
                    ShowToast({message: error.message, type: 'error'});
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const handleRemoveAgent = async (agentId: string) => {
        const response = await myTicketsFetchWithAuth(`${new URL(import.meta.url).origin}/api/agents/delete?id=${encodeURIComponent(agentId)}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to remove agent');
        const next = data.filter((agent) => agent._id !== agentId);
        accountsCache.set(CACHE_KEY, next);
        setData(next);
    };

    return <ViewAccountsWrapper data={data} permissions={permissions} isLoading={isLoading} isError={isError} onModalOpen={onModalOpen} onRemoveAgent={handleRemoveAgent} />;
}

export default ViewAccounts;

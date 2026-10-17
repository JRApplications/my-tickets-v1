import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import ViewAccountsWrapper from './view-accounts.wrapper';
import type { ViewAccountsProps } from './accounts.types';

const ViewAccounts = ({ permissions, agentId, teamId, onModalOpen, isAgentLimitReached }: ViewAccountsProps) => {
    const handleRemoveAgent = async (agentId: string) => {
        const response = await myTicketsFetchWithAuth(`${new URL(import.meta.url).origin}/api/agents/delete?id=${encodeURIComponent(agentId)}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to remove agent');
    };

    return <ViewAccountsWrapper agentId={agentId} teamId={teamId} permissions={permissions} onModalOpen={onModalOpen} onRemoveAgent={handleRemoveAgent} isAgentLimitReached={isAgentLimitReached} />;
}

export default ViewAccounts;

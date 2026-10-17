import { useRef, useState } from 'react';
import {
    Avatar,
    CustomModalLayout,
    Loader,
    Modal,
    Text,
} from '@wix/design-system';
import {
    CollectionEmptyState,
    CollectionErrorState,
    CollectionNoResultsState,
    CollectionSearch,
    PrimaryActions,
    Table,
    useTableCollection,
    type OffsetQuery,
} from '@wix/patterns';
import { CollectionPage } from '@wix/patterns/page';
import * as Icons from '@wix/wix-ui-icons-common/lazy';
import { PermissionDeniedState, ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import type { Agent } from '@jrapps/my_tickets_common_types';
import { fetchAgents } from './view-accounts';
import type { ViewAccountsWrapperProps } from './accounts.types';

interface AccountsTableProps {
    agentId: string;
    teamId: string;
    refreshKey: number;
    permissions: string[];
    isAgentLimitReached: boolean;
    onModalOpen: (modalState: 'create' | 'edit', agentId?: string) => void;
    onRemoveAgent?: (agentId: string) => Promise<void>;
    onRemoveRequested: (agent: Agent) => void;
}

const AccountsTable = ({
    agentId,
    teamId,
    refreshKey,
    permissions,
    isAgentLimitReached,
    onModalOpen,
    onRemoveAgent,
    onRemoveRequested,
}: AccountsTableProps) => {
    const agentsRef = useRef<Agent[]>();
    const canCreateAgent = permissions.includes('my-tickets-create-accounts');
    const canEditAgent = permissions.includes('my-tickets-edit-accounts');

    const tableState = useTableCollection<Agent>({
        queryName: `com.jrapps.my-tickets.agent-accounts.${agentId}.${teamId}.${refreshKey}`,
        paginationMode: 'offset',
        queryOptions: { staleTime: 0 },
        itemKey: (agent) => agent._id ?? agent.userId ?? agent.email,
        itemName: (agent) => agent.name || agent.email,
        filters: {},
        fetchData: async ({ limit, offset, search }: OffsetQuery) => {
            if (!agentsRef.current) {
                agentsRef.current = await fetchAgents();
            }

            const term = search?.trim().toLowerCase();
            const filteredAgents = term
                ? agentsRef.current.filter((agent) =>
                    agent.name.toLowerCase().includes(term) ||
                    agent.email.toLowerCase().includes(term) ||
                    agent.team?.name?.toLowerCase().includes(term) ||
                    agent.role?.roleName?.toLowerCase().includes(term),
                )
                : agentsRef.current;

            return {
                items: filteredAgents.slice(offset, offset + limit),
                total: filteredAgents.length,
            };
        },
    });

    return (
        <CollectionPage height="100%">
            <CollectionPage.Header
                title={{ text: 'Agent Accounts', hideTotal: true }}
                primaryAction={
                    <PrimaryActions
                        label="Create Agent Account"
                        prefixIcon={<Icons.Add />}
                        onClick={() => onModalOpen('create')}
                        disabled={!canCreateAgent || isAgentLimitReached}
                        tooltip={isAgentLimitReached
                            ? 'Upgrade required to add more agents'
                            : "You don't have permission to create agent accounts"}
                    />
                }
            />
            <CollectionPage.Content>
                <Table
                    state={tableState}
                    search={<CollectionSearch placeholder="Search agents" />}
                    emptyState={
                        <CollectionEmptyState
                            title="Create your first agent account"
                            subtitle="Once you create agent accounts, you'll be able to see and manage them here."
                            {...(canCreateAgent && !isAgentLimitReached
                                ? { addNewCta: { text: 'Create Agent Account', onClick: () => onModalOpen('create') } }
                                : {})}
                        />
                    }
                    noResultsState={
                        <CollectionNoResultsState
                            title="No agent accounts found"
                            subtitle="No agent accounts match your search. Try a different search term."
                        />
                    }
                    errorState={(error, { retry }) => (
                        <CollectionErrorState
                            title="Failed to load agents"
                            subtitle={String(error)}
                            action={{ text: 'Retry', onClick: retry }}
                        />
                    )}
                    onRowClick={(agent) => {
                        if (agent._id) onModalOpen('edit', agent._id);
                    }}
                    actionCell={(agent) => ({
                        secondaryActions: [
                            {
                                text: 'View',
                                icon: <Icons.Visible />,
                                disabled: !agent._id,
                                onClick: () => {
                                    if (agent._id) onModalOpen('edit', agent._id);
                                },
                            },
                            {
                                text: 'Remove',
                                icon: <Icons.Delete />,
                                disabled: !canEditAgent || !onRemoveAgent || !agent._id,
                                onClick: () => {
                                    if (agent._id) onRemoveRequested(agent);
                                },
                            },
                        ],
                    })}
                    columns={[
                        {
                            id: 'avatar',
                            title: '',
                            width: '80px',
                            render: (agent) => (
                                <Avatar
                                    name={agent.name}
                                    imgProps={agent.profilePictureUrl ? { src: agent.profilePictureUrl } : undefined}
                                />
                            ),
                        },
                        {
                            id: 'name',
                            title: 'Name',
                            render: (agent) => agent.name,
                        },
                        {
                            id: 'email',
                            title: 'Email',
                            width: '400px',
                            render: (agent) => agent.email,
                        },
                        {
                            id: 'team',
                            title: 'Team',
                            render: (agent) => agent.team?.name !== 'DEFAULT_TEAM' ? agent.team?.name ?? '' : '',
                        },
                        {
                            id: 'role',
                            title: 'Role',
                            width: '200px',
                            render: (agent) => agent.role?.roleName !== 'DEFAULT_ADMIN' ? agent.role?.roleName ?? '' : '',
                        },
                    ]}
                />
            </CollectionPage.Content>
        </CollectionPage>
    );
};

const ViewAccountsWrapper = ({
    agentId,
    teamId,
    permissions,
    onModalOpen,
    onRemoveAgent,
    isAgentLimitReached = false,
}: ViewAccountsWrapperProps) => {
    const [agentToRemove, setAgentToRemove] = useState<Agent | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    if (!permissions.includes('my-tickets-view-accounts')) {
        return <PermissionDeniedState />;
    }

    return (
        <>
            <AccountsTable
                key={refreshKey}
                agentId={agentId}
                teamId={teamId}
                refreshKey={refreshKey}
                permissions={permissions}
                isAgentLimitReached={isAgentLimitReached}
                onModalOpen={onModalOpen}
                onRemoveAgent={onRemoveAgent}
                onRemoveRequested={setAgentToRemove}
            />
            <Modal isOpen={Boolean(agentToRemove)} onRequestClose={isRemoving ? undefined : () => setAgentToRemove(null)}>
                <CustomModalLayout
                    title={<CustomModalLayout.Title>Remove agent?</CustomModalLayout.Title>}
                    subtitle={`Remove ${agentToRemove?.name || 'this agent'} from the workspace?`}
                    primaryButtonText={isRemoving ? <Loader size="tiny" /> : 'Remove agent'}
                    secondaryButtonText="Cancel"
                    primaryButtonProps={{
                        skin: 'destructive',
                        disabled: isRemoving,
                        onClick: async () => {
                            if (!agentToRemove || !onRemoveAgent) return;
                            setIsRemoving(true);
                            try {
                                if (!agentToRemove._id) {
                                    throw new Error('Agent ID is missing');
                                }
                                await onRemoveAgent(agentToRemove._id);
                                setRefreshKey((current) => current + 1);
                                setAgentToRemove(null);
                            } catch (error) {
                                console.error('Failed to remove agent', error);
                                ShowToast({ message: 'Failed to remove agent. Please try again.', type: 'error' });
                            } finally {
                                setIsRemoving(false);
                            }
                        },
                    }}
                    secondaryButtonProps={{ disabled: isRemoving, onClick: () => setAgentToRemove(null) }}
                    closeButtonProps={{ onClick: () => { if (!isRemoving) setAgentToRemove(null); } }}
                >
                    <Text>This agent will lose access to My Tickets. Existing tickets assigned to them will remain unchanged.</Text>
                </CustomModalLayout>
            </Modal>
        </>
    );
};

export default ViewAccountsWrapper;

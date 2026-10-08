import { useState } from 'react';
import {
    Button,
    Card,
    Table,
    TableToolbar,
    Search,
    TableActionCell,
    Avatar,
    Page,
    SkeletonRectangle,
    SkeletonLine,
    Tooltip,
    Modal,
    CustomModalLayout,
    Text,
    Loader,
} from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common/odeditor';

// import { MY_TICKETS_MODAL_ID, type UserData } from '../../../my-tickets.types';
import './view-accounts.css';

import type { ViewAccountsWrapperProps } from './accounts.types';
import { LoadingState, PermissionDeniedState, ShowToast } from '@jrapps/my_tickets_dashboard_ui';

interface UserData {
    _id: string;
    profilePictureUrl?: string;
    name?: string;
    email?: string;
    team?: { name: string };
    role?: { name: string };
    isAdmin?: boolean;
}

const ViewAccountsWrapper = ({ data = [], permissions, isLoading = true, isError = false, onModalOpen, onRemoveAgent }: ViewAccountsWrapperProps) => {
    const [filter, setFilter] = useState<string>('');
    const [agentToRemove, setAgentToRemove] = useState<UserData | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const handleManageUser = (userId: string | undefined) => {
        if (userId) onModalOpen('edit', userId);
    }

    const canViewAgent = permissions.includes('my-tickets-view-accounts');
    const canCreateAgent = permissions.includes('my-tickets-create-accounts');

    const normalizedFilter = filter.trim().toLowerCase();
    const filteredData = normalizedFilter
        ? data.filter((row) => {
            const nameMatch = row.name?.toLowerCase().includes(normalizedFilter) ?? false;
            const emailMatch = row.email?.toLowerCase().includes(normalizedFilter) ?? false;
            const teamMatch = typeof row.team === 'object' && row.team?.name?.toLowerCase().includes(normalizedFilter);
            const roleMatch = typeof row.role === 'object' && row.role?.roleName?.toLowerCase().includes(normalizedFilter);
            return nameMatch || emailMatch || !!teamMatch || !!roleMatch;
        })
        : data;

    const columns = [
        { title: '', width: '80px', render: (row: UserData) => row.profilePictureUrl ? <Avatar imgProps={{ src: row.profilePictureUrl }} /> : <Avatar /> },
        { title: 'Name', render: (row: UserData) => row.name ? row.name : '' },
        { title: 'Email', width: '400px', render: (row: UserData) => row.email ? row.email : '' },
        { title: 'Team', render: (row: UserData) => typeof row.team === 'object' && row.team.name !== "DEFAULT_TEAM" ? row.team.name : '' },
        { title: 'Role', width: '200px', render: (row: UserData) => typeof row.role === 'object' && row.role.name !== "DEFAULT_ADMIN" ? row.role.name : '' },
        {
            title: '',
            width: '100px',
            render: (row: UserData) =>
                <TableActionCell
                    popoverMenuProps={
                        { appendTo: 'window', placement: 'left' }
                    }
                    secondaryActions={[
                        {
                            text: 'View',
                            icon: <Icons.Visible />,
                            disabled: !canViewAgent,
                            onClick: () => {
                                handleManageUser(row._id);
                            },
                        },
                        {
                            text: 'Remove',
                            icon: <Icons.Delete />,
                            disabled: !permissions.includes('my-tickets-edit-accounts') || !onRemoveAgent,
                            onClick: () => setAgentToRemove(row),
                        },
                    ]}
                    moreActionsTooltipText="More actions"
                />
        },
    ];

    const handleCreateUser = () => {
        onModalOpen('create');
    }

    if (!permissions.includes('my-tickets-view-accounts')) {
        return (
            <PermissionDeniedState />
        );
    }

    if (isError) {
        return (
            <LoadingState
                state={'error'}
                errorText='Failed to load agents. Please try again later.'
            />
        );
    }

    const renderEmptyState = () => {
        if (normalizedFilter) {
            return (
                <Table.EmptyState
                    skin='page-no-border'
                    title="No agent accounts found"
                    subtitle={`No agent accounts match "${filter}". Try a different search term.`}
                />
            );
        }
        return (
            <Table.EmptyState
                skin='page-no-border'
                title="Create your first agent account"
                subtitle="Once you create agent accounts, you'll be able to see and manage them here."
            >
                <Tooltip disabled={canCreateAgent} content="You don't have permission to create agent accounts">
                    <Button
                        size='large'
                        prefixIcon={<Icons.Add />}
                        onClick={handleCreateUser}
                        disabled={!canCreateAgent}>
                        Create Agent Account
                    </Button>
                </Tooltip>
            </Table.EmptyState>
        );
    };

    return (
        <>
        <Page maxWidth={9999} className="view-accounts-page">
            <Page.Header
                title="Agent Accounts"
                actionsBar={isLoading ? <SkeletonRectangle width="130px" height="40px" /> : (
                    <Tooltip disabled={canCreateAgent} content="You don't have permission to create agent accounts">
                        <Button
                            size="medium"
                            disabled={!canCreateAgent}
                            onClick={handleCreateUser}
                            prefixIcon={<Icons.Add />}>
                            Create Agent Account
                        </Button>
                    </Tooltip>
                )}
            />
            <Page.Content>
                {isLoading && (
                    <Card>
                        <Table
                            showHeaderWhenEmpty
                            columns={[
                                { title: <SkeletonLine width="100px" />, render: () => <SkeletonRectangle width="100px" height="20px" /> },
                                { title: <SkeletonLine width="100px" />, render: () => <SkeletonRectangle width="100px" height="20px" /> },
                                { title: <SkeletonLine width="100px" />, render: () => <SkeletonRectangle width="100px" height="20px" /> },
                                {
                                    title: '',
                                    width: '100px',
                                    render: () =>
                                        <SkeletonRectangle width="50px" height="30px" />
                                },
                            ]}
                            data={[{}, {}, {}]}
                        >
                            <TableToolbar>
                                <TableToolbar.ItemGroup position="end">
                                    <TableToolbar.Item>
                                        <SkeletonRectangle width="200px" height="35px" />
                                    </TableToolbar.Item>
                                </TableToolbar.ItemGroup>
                            </TableToolbar>
                            <Table.Content />
                        </Table>
                    </Card>
                )}

                {!isLoading && !isError && <Card>
                    <Table data={filteredData as any} columns={columns} rowVerticalPadding="small">
                        <TableToolbar className='view-accounts-table-toolbar-root'>
                            <TableToolbar.ItemGroup position="end">
                                <TableToolbar.Item>
                                    <Search
                                        size="medium"
                                        value={filter}
                                        onChange={(event) =>
                                            setFilter(event.target.value)
                                        }
                                        onClear={() => setFilter('')}
                                    />
                                </TableToolbar.Item>
                            </TableToolbar.ItemGroup>
                        </TableToolbar>
                        {filteredData.length === 0 && renderEmptyState()}
                        <Table.Content />
                    </Table>
                </Card>}
            </Page.Content>
        </Page>
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
                            await onRemoveAgent(agentToRemove._id);
                            setAgentToRemove(null);
                        } catch (error) {
                            console.error(error);
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

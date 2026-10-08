import React, { useState } from 'react';
import {
    Box,
    Button,
    Search,
    Text,
    Table,
    TableToolbar,
    Page,
    Avatar,
    Card,
    SkeletonRectangle,
    SkeletonLine,
    Tooltip
} from '@wix/design-system';
import { Add, Edit } from '@wix/wix-ui-icons-common/odeditor';
import { LoadingState } from '@jrapps/my_tickets_dashboard_ui';
import { PermissionDeniedState } from '@jrapps/my_tickets_dashboard_ui';

import './view-teams.css';

interface TeamData {
    _id: string;
    name?: string;
    description?: string;
    department?: string;
    teamPictureUrl?: string;
}

import type { ViewTeamsWrapperProps } from './teams.types';

const ViewTeamsWrapper = ({ data = [], permissions, isLoading = true, isError = false, onModalOpen }: ViewTeamsWrapperProps) => {

    const [searchQuery, setSearchQuery] = useState('');

    const handleCreateTeam = () => {
        onModalOpen && onModalOpen('create');
    }

    const handleEditTeam = (id: string | undefined) => {
        if (!id) return;
        onModalOpen && onModalOpen('edit', id);
    }

    const canEditTeam = permissions.includes('my-tickets-edit-teams');
    const canCreateTeam = permissions.includes('my-tickets-create-teams');

    if (!permissions.includes('my-tickets-view-teams')) {
        return (<PermissionDeniedState />);
    }

    if (isError) {
        return (
            <LoadingState
                state={'error'}
                errorText='Failed to load teams. Please try again later.'
            />
        );
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredData = normalizedQuery
        ? data.filter((team) => {
            const nameMatch = team.name?.toLowerCase().includes(normalizedQuery) ?? false;
            const descMatch = team.description?.toLowerCase().includes(normalizedQuery) ?? false;
            const departmentMatch = team.department?.toLowerCase().includes(normalizedQuery) ?? false;
            return nameMatch || descMatch || departmentMatch;
        })
        : data;

    const columns = [
        {
            title: '',
            width: '56px',
            render: (row: TeamData) => (
                <Avatar
                    size='size36'
                    imgProps={row.teamPictureUrl ? { src: row.teamPictureUrl } : undefined}
                    name={row.name}
                />
            ),
        },
        {
            title: 'Name',
            render: (row: TeamData) => (
                <Text weight='normal'>{row.name}</Text>
            ),
        },
        {
            title: 'Department',
            render: (row: TeamData) => (
                <Text weight='normal'>{row.department || '—'}</Text>
            ),
        },
        {
            title: 'Description',
            render: (row: TeamData) => (
                <Text weight='normal' secondary>{row.description}</Text>
            ),
        },
        {
            title: '',
            width: '80px',
            render: (row: TeamData) => (
                <Tooltip disabled={canEditTeam} content="You don't have permission to edit teams">
                    <Button
                        size='small'
                        priority='secondary'
                        prefixIcon={<Edit />}
                        disabled={!canEditTeam}
                        onClick={() => handleEditTeam(row._id)}
                    >
                        Edit
                    </Button>
                </Tooltip>
            ),
        },
    ];

    const renderEmptyState = () => {
        if (normalizedQuery) {
            return (
                <Box width='100%' WebkitJustifyContent='center'>
                    <Table.EmptyState
                        className='view-teams-empty-state'
                        skin='page-no-border'
                        title='No teams found'
                        subtitle={`No teams match "${searchQuery}". Try a different search term.`}
                    />
                </Box>
            );
        }
        return (
            <Box width='100%' WebkitJustifyContent='center'>
                <Table.EmptyState
                    className='view-teams-empty-state'
                    skin='page-no-border'
                    title="Create your first team"
                    subtitle="Once you create teams, you'll be able to see and manage them here."
                >
                    <Tooltip disabled={canCreateTeam} content="You don't have permission to create teams">
                        <Button
                            size='large'
                            prefixIcon={<Add />}
                            onClick={handleCreateTeam}
                            disabled={!canCreateTeam}>
                            Create Team
                        </Button>
                    </Tooltip>
                </Table.EmptyState>
            </Box>
        );
    };

    return (
        <Page maxWidth={9999} className="view-teams-page">
            <Page.Header
                title="Teams"
                actionsBar={isLoading ? <SkeletonRectangle width="130px" height="40px" /> : (
                    <Tooltip disabled={canCreateTeam} content="You don't have permission to create teams">
                        <Button size="medium" prefixIcon={<Add />} onClick={handleCreateTeam} disabled={!canCreateTeam}>
                            Create Team
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

                {!isLoading && (
                    <Card>
                        <Table
                            data={filteredData}
                            columns={columns}
                        >
                            <Table.ToolbarContainer>
                                {() => (
                                    <TableToolbar>
                                        <TableToolbar.ItemGroup position="end">
                                            <TableToolbar.Item>
                                                <Search
                                                    value={searchQuery}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                                    onClear={() => setSearchQuery('')}
                                                    placeholder='Search teams'
                                                    clearButton
                                                />
                                            </TableToolbar.Item>
                                        </TableToolbar.ItemGroup>
                                    </TableToolbar>
                                )}
                            </Table.ToolbarContainer>
                            <Table.Titlebar />
                            {filteredData.length > 0 ? (
                                <Table.Content titleBarVisible={false} />
                            ) : (
                                renderEmptyState()
                            )}
                        </Table>
                    </Card>
                )}
            </Page.Content>
        </Page>
    );
};

export default ViewTeamsWrapper;

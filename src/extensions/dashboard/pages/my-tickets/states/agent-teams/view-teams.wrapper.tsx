import { useRef } from 'react';
import { Avatar, Text } from '@wix/design-system';
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
import { Add, Edit } from '@wix/wix-ui-icons-common/lazy';
import { PermissionDeniedState } from '@jrapps/my_tickets_dashboard_ui';
import { fetchTeams } from './view-teams';
import type { TeamData, ViewTeamsWrapperProps } from './teams.types';

const ViewTeamsWrapper = ({
    agentId,
    teamId,
    permissions,
    onModalOpen,
    isTeamLimitReached = false,
}: ViewTeamsWrapperProps) => {
    const teamsRef = useRef<TeamData[]>();
    const canEditTeam = permissions.includes('my-tickets-edit-teams');
    const canCreateTeam = permissions.includes('my-tickets-create-teams');

    const tableState = useTableCollection<TeamData>({
        queryName: `com.jrapps.my-tickets.teams.${agentId}.${teamId}`,
        paginationMode: 'offset',
        queryOptions: { staleTime: 0 },
        itemKey: (team) => team._id,
        itemName: (team) => team.name ?? 'Team',
        filters: {},
        fetchData: async ({ limit, offset, search }: OffsetQuery) => {
            if (!teamsRef.current) {
                teamsRef.current = await fetchTeams();
            }

            const term = search?.trim().toLowerCase();
            const filteredTeams = term
                ? teamsRef.current.filter((team) =>
                    team.name?.toLowerCase().includes(term) ||
                    team.description?.toLowerCase().includes(term) ||
                    team.department?.toLowerCase().includes(term),
                )
                : teamsRef.current;

            return {
                items: filteredTeams.slice(offset, offset + limit),
                total: filteredTeams.length,
            };
        },
    });

    if (!permissions.includes('my-tickets-view-teams')) {
        return <PermissionDeniedState />;
    }

    return (
        <CollectionPage height="100%">
            <CollectionPage.Header
                title={{ text: 'Teams', hideTotal: true }}
                primaryAction={
                    <PrimaryActions
                        label="Create Team"
                        prefixIcon={<Add />}
                        onClick={() => onModalOpen?.('create')}
                        disabled={!canCreateTeam || isTeamLimitReached}
                        tooltip={isTeamLimitReached
                            ? 'Upgrade required to add more teams'
                            : "You don't have permission to create teams"}
                    />
                }
            />
            <CollectionPage.Content>
                <Table
                    state={tableState}
                    search={<CollectionSearch placeholder="Search teams" />}
                    emptyState={
                        <CollectionEmptyState
                            title="Create your first team"
                            subtitle="Once you create teams, you'll be able to see and manage them here."
                            {...(canCreateTeam && !isTeamLimitReached
                                ? { addNewCta: { text: 'Create Team', onClick: () => onModalOpen?.('create') } }
                                : {})}
                        />
                    }
                    noResultsState={
                        <CollectionNoResultsState
                            title="No teams found"
                            subtitle="No teams match your search. Try a different search term."
                        />
                    }
                    errorState={(error, { retry }) => (
                        <CollectionErrorState
                            title="Failed to load teams"
                            subtitle={String(error)}
                            action={{ text: 'Retry', onClick: retry }}
                        />
                    )}
                    onRowClick={(team) => {
                        if (canEditTeam) onModalOpen?.('edit', team._id);
                    }}
                    actionCell={(team) => ({
                        secondaryActions: [
                            {
                                text: 'Edit',
                                icon: <Edit />,
                                disabled: !canEditTeam,
                                tooltip: "You don't have permission to edit teams",
                                onClick: () => onModalOpen?.('edit', team._id),
                            },
                        ],
                    })}
                    columns={[
                        {
                            id: 'avatar',
                            title: '',
                            width: '56px',
                            render: (team) => (
                                <Avatar
                                    size="size36"
                                    name={team.name}
                                    imgProps={team.teamPictureUrl ? { src: team.teamPictureUrl } : undefined}
                                />
                            ),
                        },
                        {
                            id: 'name',
                            title: 'Name',
                            render: (team) => <Text>{team.name}</Text>,
                        },
                        {
                            id: 'department',
                            title: 'Department',
                            render: (team) => <Text>{team.department || '—'}</Text>,
                        },
                        {
                            id: 'description',
                            title: 'Description',
                            render: (team) => <Text secondary>{team.description}</Text>,
                        },
                    ]}
                />
            </CollectionPage.Content>
        </CollectionPage>
    );
};

export default ViewTeamsWrapper;

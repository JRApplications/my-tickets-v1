import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Box,
    TableActionCell,
    Text,
    TextButton,
} from '@wix/design-system';
import {
    CollectionEmptyState,
    CollectionErrorState,
    CollectionNoResultsState,
    CollectionSearch,
    CollectionToolbarFilters,
    idNameArrayFilter,
    PrimaryActions,
    SingleSelectFilter,
    stringsArrayFilter,
    Table,
    useSelector,
    useStaticListFilterCollection,
    useTableCollection,
} from '@wix/patterns';
import { CollectionPage } from '@wix/patterns/page';
import {
    formatPriority,
    formatStatus,
    getPrioritySkin,
    getStatusSkin,
    PRIORITY_OPTIONS,
    STATUS_OPTIONS,
    type TicketPriority,
    type TicketStatus,
    getSlaSummary,
} from '@jrapps/my_tickets_common_types';
import * as Icons from '@wix/wix-ui-icons-common/lazy';
import SlaBadge from '../../common-components/sla-badge/sla-badge';
import { fetchTicketPage, type TicketAssigneeOption, type TicketPageFilters, type TicketsListItem } from './tickets-list';

type TicketsListWrapperProps = {
    teamId: string;
    assigneeOptions: TicketAssigneeOption[];
    permissions: string[];
    onTicketClick: (ticketId: string) => void;
    onCreateTicket: () => void;
    isTicketLimitReached?: boolean;
    onVisibleTicketsChange?: (ticketIds: string[]) => void;
    onGetTicketUpdateFn?: (updateFn: (ticketId: string, updates: {
        status?: string;
        priority?: string;
        isSpam?: boolean;
        isDeleted?: boolean;
        assignedAgent?: { id?: string; name?: string };
        assignedTeam?: { id?: string; name?: string };
    }) => void) => void;
};

const ALL = 'all';
const FILTERS_STORAGE_KEY = 'my-tickets:sidebar-filters';
type SlaFilter = 'breached' | 'at_risk';
type SortOrder = 'newest' | 'oldest';

const readSavedSlaFilter = (): SlaFilter | undefined => {
    try {
        const saved: unknown = JSON.parse(window.localStorage.getItem(FILTERS_STORAGE_KEY) ?? '{}');
        if (typeof saved !== 'object' || saved === null || !('sla' in saved)) return undefined;
        return saved.sla === 'breached' || saved.sla === 'at_risk' ? saved.sla : undefined;
    } catch (error) {
        console.error('Failed to read the saved ticket SLA filter', error);
        return undefined;
    }
};

const formatCreatedDate = (createdDate?: string) => {
    if (!createdDate) return null;
    const date = new Date(createdDate);
    if (Number.isNaN(date.getTime())) return null;
    return {
        date: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date),
        time: new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(date),
    };
};

const TicketsListWrapper = ({ teamId, assigneeOptions: availableAssignees, permissions, onTicketClick, onCreateTicket, isTicketLimitReached = false, onVisibleTicketsChange, onGetTicketUpdateFn }: TicketsListWrapperProps) => {
    const canViewTickets = permissions.includes('my-tickets-view-all-tickets');
    const canCreateTicket = permissions.includes('my-tickets-create-ticket');
    const [filterConfig] = useState(() => {
        const initialSla = readSavedSlaFilter();
        return {
            status: stringsArrayFilter<string>({
                name: 'Status',
                itemKey: (value) => value,
                itemName: (value) => formatStatus(value as TicketStatus),
            }),
            priority: stringsArrayFilter<string>({
                name: 'Priority',
                itemKey: (value) => value,
                itemName: (value) => formatPriority(value as TicketPriority),
            }),
            assignee: idNameArrayFilter<{ id: string; name: string }>({ name: 'Assignee' }),
            sla: stringsArrayFilter<SlaFilter>({
                name: 'SLA',
                itemKey: (value) => value,
                itemName: (value) => value === 'at_risk' ? 'At risk' : 'Breached',
                ...(initialSla ? { initialValue: [initialSla] } : {}),
            }),
            sortOrder: stringsArrayFilter<SortOrder>({
                name: 'Sort order',
                itemKey: (value) => value,
                itemName: (value) => value === 'oldest' ? 'Oldest first' : 'Newest first',
            }),
        };
    });
    const tableState = useTableCollection<TicketsListItem, typeof filterConfig>({
        queryName: `com.jrapps.my-tickets.ticket-sidebar.${teamId}`,
        paginationMode: 'cursor',
        queryOptions: { staleTime: 0 },
        itemKey: (ticket) => ticket._id,
        itemName: (ticket) => `#${ticket.primaryTicketId} ${ticket.subject}`,
        filters: filterConfig,
        fetchData: async (query) => {
            const filters: TicketPageFilters = {
                status: query.filters.status?.[0],
                priority: query.filters.priority?.[0],
                assignee: query.filters.assignee?.[0]?.id,
                sla: query.filters.sla?.[0],
                sortOrder: query.filters.sortOrder?.[0],
            };
            return fetchTicketPage({
                teamId,
                limit: query.limit,
                cursor: query.cursor ?? undefined,
                search: query.search,
                filters,
            });
        },
        fetchErrorMessage: ({ err }) => err instanceof Error ? err.message : 'Failed to load tickets',
    });

    const statusOptions = useStaticListFilterCollection(
        filterConfig.status,
        STATUS_OPTIONS.map((option) => String(option.id)),
    );
    const priorityOptions = useStaticListFilterCollection(
        filterConfig.priority,
        PRIORITY_OPTIONS.map((option) => option.id),
    );
    const assigneeFilterOptions = useStaticListFilterCollection(
        filterConfig.assignee,
        [
            { id: 'unassigned', name: 'Unassigned' },
            ...availableAssignees.map((option) => ({ id: option.id, name: option.value })),
        ],
    );
    const slaOptions = useStaticListFilterCollection(filterConfig.sla, ['breached', 'at_risk']);
    const sortOptions = useStaticListFilterCollection(filterConfig.sortOrder, ['newest', 'oldest']);
    const visibleTicketIdsKey = useSelector(() =>
        tableState.keyedItems.map(({ key }) => key).join('\u0000'),
    );
    const hasSlaData = useSelector(() =>
        tableState.keyedItems.some(({ item }) => Boolean(getSlaSummary(item.sla))),
    );
    const visibleTicketIds = useMemo(
        () => visibleTicketIdsKey ? visibleTicketIdsKey.split('\u0000') : [],
        [visibleTicketIdsKey],
    );
    const [ticketUpdates, setTicketUpdates] = useState<Record<string, Partial<TicketsListItem>>>({});

    const updateTicket = useCallback((ticketId: string, updates: Partial<TicketsListItem>) => {
        setTicketUpdates((current) => ({
            ...current,
            [ticketId]: { ...current[ticketId], ...updates },
        }));
    }, []);
    const getDisplayTicket = useCallback((ticket: TicketsListItem) => ({
        ...ticket,
        ...ticketUpdates[ticket._id],
    }), [ticketUpdates]);

    const slaFilterValue = useSelector(() => filterConfig.sla.value[0] ?? ALL);
    useEffect(() => {
        try {
            const saved = JSON.parse(window.localStorage.getItem(FILTERS_STORAGE_KEY) ?? '{}');
            window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ ...saved, sla: slaFilterValue }));
        } catch (error) {
            console.error('Failed to persist the ticket SLA filter', error);
        }
    }, [slaFilterValue]);

    useEffect(() => {
        onVisibleTicketsChange?.(visibleTicketIds);
    }, [visibleTicketIds, onVisibleTicketsChange]);
    useEffect(() => {
        onGetTicketUpdateFn?.(updateTicket);
    }, [onGetTicketUpdateFn, updateTicket]);

    return (
        <CollectionPage height="100%">
            <CollectionPage.Header
                title={{ text: 'Tickets', hideTotal: true }}
                subtitle={{ text: 'Manage and respond to customer support tickets.' }}
                primaryAction={
                    <PrimaryActions
                        label="Create Ticket"
                        prefixIcon={<Icons.Add />}
                        onClick={onCreateTicket}
                        disabled={!canCreateTicket || isTicketLimitReached}
                        tooltip={isTicketLimitReached ? 'Upgrade required to create more tickets this month' : "You don't have permission to create tickets"}
                    />
                }
            />
            <CollectionPage.Content>
                {!canViewTickets ? (
                    <Text>You don't have permission to view tickets.</Text>
                ) : (
                    <Table
                        state={tableState}
                        search={<CollectionSearch placeholder="Search tickets or keywords" maxLength={100} />}
                        filters={
                            <CollectionToolbarFilters inline={2} panelTitle="Filter tickets">
                                <SingleSelectFilter
                                    filter={filterConfig.status}
                                    collection={statusOptions}
                                    placeholder="All statuses"
                                    accordionItemProps={{ label: 'Status' }}
                                />
                                <SingleSelectFilter
                                    filter={filterConfig.priority}
                                    collection={priorityOptions}
                                    placeholder="All priorities"
                                    accordionItemProps={{ label: 'Priority' }}
                                />
                                <SingleSelectFilter
                                    filter={filterConfig.assignee}
                                    collection={assigneeFilterOptions}
                                    placeholder="All assignees"
                                    accordionItemProps={{ label: 'Assignee' }}
                                />
                                <SingleSelectFilter
                                    filter={filterConfig.sla}
                                    collection={slaOptions}
                                    placeholder="All SLA states"
                                    accordionItemProps={{ label: 'SLA' }}
                                />
                                <SingleSelectFilter
                                    filter={filterConfig.sortOrder}
                                    collection={sortOptions}
                                    placeholder="Newest first"
                                    accordionItemProps={{ label: 'Sort order' }}
                                />
                            </CollectionToolbarFilters>
                        }
                        emptyState={
                            <CollectionEmptyState
                                title="No tickets yet"
                                subtitle="Create a ticket to start helping your customers."
                                {...(canCreateTicket && !isTicketLimitReached
                                    ? { addNewCta: { text: 'Create Ticket', onClick: onCreateTicket } }
                                    : {})}
                            />
                        }
                        noResultsState={
                            <CollectionNoResultsState
                                title="No tickets match these filters"
                                subtitle="Try changing your search or filters."
                            />
                        }
                        errorState={(error, { retry }) => (
                            <CollectionErrorState
                                title="Tickets couldn't be loaded"
                                subtitle={String(error)}
                                action={{ text: 'Retry', onClick: retry }}
                            />
                        )}
                        onRowClick={(ticket) => onTicketClick(ticket._id)}
                        columns={[
                            {
                                id: 'ticket',
                                title: 'Ticket',
                                width: '130px',
                                render: (ticket) => {
                                    const displayTicket = getDisplayTicket(ticket);
                                    return <TextButton size="small" onClick={() => onTicketClick(ticket._id)}>#{displayTicket.primaryTicketId}</TextButton>;
                                },
                            },
                            {
                                id: 'assignee',
                                title: 'Assignee',
                                width: '190px',
                                render: (ticket) => {
                                    const displayTicket = getDisplayTicket(ticket);
                                    return <Text size="small" secondary>{displayTicket.assignedAgent?.name || displayTicket.assignedTeam?.name || 'Unassigned'}</Text>;
                                },
                            },
                            {
                                id: 'subject',
                                title: 'Subject',
                                render: (ticket) => <Text size="small" weight="bold" ellipsis>{getDisplayTicket(ticket).subject || 'No subject'}</Text>,
                            },
                            {
                                id: 'status',
                                title: 'Status',
                                width: '150px',
                                render: (ticket) => {
                                    const status = getDisplayTicket(ticket).status as TicketStatus;
                                    return <Badge size="small" skin={getStatusSkin(status)}>{formatStatus(status)}</Badge>;
                                },
                            },
                            {
                                id: 'priority',
                                title: 'Priority',
                                width: '120px',
                                render: (ticket) => {
                                    const priority = getDisplayTicket(ticket).priority as TicketPriority;
                                    return <Badge size="small" skin={getPrioritySkin(priority)}>{formatPriority(priority)}</Badge>;
                                },
                            },
                            ...(hasSlaData ? [{
                                id: 'sla',
                                title: 'SLA',
                                width: '170px',
                                render: (ticket: TicketsListItem) => <SlaBadge sla={getDisplayTicket(ticket).sla} compact />,
                            }] : []),
                            {
                                id: 'created',
                                title: 'Created',
                                width: '180px',
                                render: (ticket) => {
                                    const created = formatCreatedDate(getDisplayTicket(ticket).createdDate);
                                    return created ? (
                                        <Box direction="vertical">
                                            <Text size="small">{created.date}</Text>
                                            <Text size="small" secondary>{created.time}</Text>
                                        </Box>
                                    ) : <Text size="small" secondary>—</Text>;
                                },
                            },
                            {
                                id: 'actions',
                                title: '',
                                width: '56px',
                                render: (ticket) => (
                                    <TableActionCell
                                        primaryAction={{ text: 'Open ticket', icon: <Icons.Visible />, onClick: () => onTicketClick(ticket._id) }}
                                    />
                                ),
                            },
                        ]}
                    />
                )}
            </CollectionPage.Content>
        </CollectionPage>
    );
};

export default TicketsListWrapper;

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
    Badge,
    Box,
    Button,
    Card,
    Dropdown,
    Page,
    Search,
    Table,
    TableActionCell,
    Text,
    TextButton,
    Tooltip,
} from '@wix/design-system';
import {
    formatPriority,
    formatStatus,
    getPrioritySkin,
    getStatusSkin,
    STATUS_OPTIONS,
    type TicketPriority,
    type TicketStatus,
    getSlaSummary,
} from '@jrapps/my_tickets_common_types';
import * as Icons from '@wix/wix-ui-icons-common/odeditor';
import SlaBadge from '../../common-components/sla-badge/sla-badge';
import type { TicketsListItem } from './tickets-list';
import './tickets-list.css';

type TicketsListWrapperProps = {
    tickets: TicketsListItem[];
    isLoading: boolean;
    isError: boolean;
    searchTerm: string;
    handleSearch: (event: ChangeEvent<HTMLInputElement>) => void;
    handleClear: () => void;
    loadMore: () => Promise<void>;
    hasMore: boolean;
    isLoadingMore: boolean;
    permissions: string[];
    onTicketClick: (ticketId: string) => void;
    onCreateTicket: () => void;
    isTicketLimitReached?: boolean;
    onVisibleTicketsChange?: (ticketIds: string[]) => void;
};

const ALL = 'all';
const FILTERS_STORAGE_KEY = 'my-tickets:sidebar-filters';

const readSavedSlaFilter = () => {
    try {
        const saved = JSON.parse(window.localStorage.getItem(FILTERS_STORAGE_KEY) ?? '{}');
        return typeof saved.sla === 'string' ? saved.sla : ALL;
    } catch {
        return ALL;
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

const TicketsListWrapper = ({ tickets, isLoading, isError, searchTerm, handleSearch, handleClear, loadMore, hasMore, isLoadingMore, permissions, onTicketClick, onCreateTicket, isTicketLimitReached = false, onVisibleTicketsChange }: TicketsListWrapperProps) => {
    const [statusFilter, setStatusFilter] = useState<string>(ALL);
    const [priorityFilter, setPriorityFilter] = useState<string>(ALL);
    const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL);
    const [slaFilter, setSlaFilter] = useState<string>(readSavedSlaFilter);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    const canViewTickets = permissions.includes('my-tickets-view-single-ticket');
    const canCreateTicket = permissions.includes('my-tickets-create-ticket');

    const statusOptions = [
        { id: ALL, value: 'All statuses' },
        ...STATUS_OPTIONS.map((option) => ({ id: String(option.id), value: String(option.value) })),
    ];
    const priorityOptions = [
        { id: ALL, value: 'All priorities' },
        ...Array.from(new Set(tickets.map((ticket) => ticket.priority).filter(Boolean))).map((priority) => ({
            id: priority,
            value: formatPriority(priority as TicketPriority),
        })),
    ];
    const assigneeOptions = [
        { id: ALL, value: 'All assignees' },
        { id: 'unassigned', value: 'Unassigned' },
        ...Array.from(new Map(tickets.filter((ticket) => ticket.assignedAgent?.id).map((ticket) => [
            ticket.assignedAgent!.id!,
            { id: ticket.assignedAgent!.id!, value: ticket.assignedAgent!.name || 'Agent' },
        ])).values()),
    ];
    const slaOptions = [
        { id: ALL, value: 'All' },
        { id: 'breached', value: 'Breached' },
        { id: 'at_risk', value: 'At risk' },
    ];

    useEffect(() => {
        try {
            const saved = JSON.parse(window.localStorage.getItem(FILTERS_STORAGE_KEY) ?? '{}');
            window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ ...saved, sla: slaFilter }));
        } catch {
            // SLA filtering still works if storage is unavailable.
        }
    }, [slaFilter]);

    const rows = useMemo(() => {
        const filtered = tickets.filter((ticket) =>
            !ticket.isSpam && !ticket.isDeleted &&
            (statusFilter === ALL || ticket.status === statusFilter) &&
            (priorityFilter === ALL || ticket.priority === priorityFilter) &&
            (assigneeFilter === ALL || (assigneeFilter === 'unassigned' ? !ticket.assignedAgent?.id : ticket.assignedAgent?.id === assigneeFilter)) &&
            (slaFilter === ALL || getSlaSummary(ticket.sla)?.state === slaFilter),
        );
        return sortOrder === 'newest' ? filtered : [...filtered].reverse();
    }, [tickets, statusFilter, priorityFilter, assigneeFilter, slaFilter, sortOrder]);

    useEffect(() => {
        onVisibleTicketsChange?.(rows.map((ticket) => ticket._id));
    }, [rows, onVisibleTicketsChange]);

    const hasSlaData = tickets.some((ticket) => Boolean(getSlaSummary(ticket.sla)));

    const columns = [
        {
            title: 'Ticket',
            width: '130px',
            render: (ticket: TicketsListItem) => <TextButton size="small" onClick={() => onTicketClick(ticket._id)}>#{ticket.primaryTicketId}</TextButton>,
        },
        {
            title: 'Assignee',
            width: '190px',
            render: (ticket: TicketsListItem) => <Text size="small" secondary>{ticket.assignedAgent?.name || ticket.assignedTeam?.name || 'Unassigned'}</Text>,
        },
        {
            title: 'Subject',
            render: (ticket: TicketsListItem) => <Text size="small" weight="bold" ellipsis>{ticket.subject || 'No subject'}</Text>,
        },
        {
            title: 'Status',
            width: '150px',
            render: (ticket: TicketsListItem) => <Badge size="small" skin={getStatusSkin(ticket.status as TicketStatus)}>{formatStatus(ticket.status as TicketStatus)}</Badge>,
        },
        {
            title: 'Priority',
            width: '120px',
            render: (ticket: TicketsListItem) => <Badge size="small" skin={getPrioritySkin(ticket.priority as TicketPriority)}>{formatPriority(ticket.priority as TicketPriority)}</Badge>,
        },
        ...(hasSlaData ? [{
            title: 'SLA',
            width: '170px',
            render: (ticket: TicketsListItem) => <SlaBadge sla={ticket.sla} compact />,
        }] : []),
        {
            title: 'Created',
            width: '180px',
            render: (ticket: TicketsListItem) => {
                const created = formatCreatedDate(ticket.createdDate);
                return created ? (
                    <Box direction="vertical">
                        <Text size="small">{created.date}</Text>
                        <Text size="small" secondary>{created.time}</Text>
                    </Box>
                ) : <Text size="small" secondary>—</Text>;
            },
        },
        {
            title: '',
            width: '56px',
            render: (ticket: TicketsListItem) => (
                <TableActionCell
                    // moreActionsTooltipText="Ticket actions"
                    // secondaryActions={[{ text: 'Open ticket', icon: <Icons.Visible />, onClick: () => onTicketClick(ticket._id) }]}
                    primaryAction={{ text: 'Open ticket', icon: <Icons.Visible />, onClick: () => onTicketClick(ticket._id) }}
                />
            ),
        },
    ];

    return (
        <Page maxWidth={9999} className="tickets-list-page">
            <Page.Header
                title="Tickets"
                subtitle="Manage and respond to customer support tickets."
                actionsBar={(
                    <Tooltip disabled={canCreateTicket && !isTicketLimitReached} content={isTicketLimitReached ? 'Upgrade required to create more tickets this month' : "You don't have permission to create tickets"}>
                        <Button prefixIcon={<Icons.Add />} onClick={onCreateTicket} disabled={!canCreateTicket || isTicketLimitReached}>Create Ticket</Button>
                    </Tooltip>
                )}
            />
            <Page.Content>
                {!canViewTickets ? (
                    <Card><Card.Content><Text>You don't have permission to view tickets.</Text></Card.Content></Card>
                ) : isError ? (
                    <Table.EmptyState title="Tickets couldn't be loaded" subtitle="Refresh the page and try again." />
                ) : (
                    <Card>
                        <Box className="tickets-list-toolbar" gap="SP2" verticalAlign="middle" style={{ flexWrap: 'wrap' }}>
                            <Box className="tickets-list-search"><Search value={searchTerm} placeholder="Search tickets or keywords" onChange={handleSearch} onClear={handleClear} clearButton /></Box>
                            <Dropdown options={statusOptions} selectedId={statusFilter} onSelect={(option) => setStatusFilter(String(option.id))} />
                            <Dropdown options={priorityOptions} selectedId={priorityFilter} onSelect={(option) => setPriorityFilter(String(option.id))} />
                            <Dropdown options={assigneeOptions} selectedId={assigneeFilter} onSelect={(option) => setAssigneeFilter(String(option.id))} />
                            <Dropdown options={slaOptions} selectedId={slaFilter} onSelect={(option) => setSlaFilter(String(option.id))} />
                            <Dropdown options={[{ id: 'newest', value: 'Newest first' }, { id: 'oldest', value: 'Oldest first' }]} selectedId={sortOrder} onSelect={(option) => setSortOrder(option.id as 'newest' | 'oldest')} />
                        </Box>
                        {isLoading ? (
                            <Box padding="SP6" align="center"><Text>Loading tickets…</Text></Box>
                        ) : rows.length ? (
                            <Table data={rows} columns={columns} rowVerticalPadding="medium" />
                        ) : (
                            <Table.EmptyState
                                title={searchTerm || statusFilter !== ALL || priorityFilter !== ALL || assigneeFilter !== ALL || slaFilter !== ALL ? 'No tickets match these filters' : 'No tickets yet'}
                                subtitle={searchTerm || statusFilter !== ALL || priorityFilter !== ALL || assigneeFilter !== ALL || slaFilter !== ALL ? 'Try changing your search or filters.' : 'Create a ticket to start helping your customers.'}
                            >
                                {!searchTerm && statusFilter === ALL && priorityFilter === ALL && assigneeFilter === ALL && slaFilter === ALL && canCreateTicket && <Tooltip disabled={!isTicketLimitReached} content="Upgrade required to create more tickets this month"><Button onClick={onCreateTicket} disabled={isTicketLimitReached} prefixIcon={<Icons.Add />}>Create Ticket</Button></Tooltip>}
                            </Table.EmptyState>
                        )}
                        {hasMore && <Box className="tickets-list-load-more" align="center" padding="SP3"><Button priority="secondary" onClick={loadMore} disabled={isLoadingMore}>{isLoadingMore ? 'Loading…' : 'Load more tickets'}</Button></Box>}
                    </Card>
                )}
            </Page.Content>
        </Page>
    );
};

export default TicketsListWrapper;

import { 
    Box, 
    Search, 
    Divider, 
    Text, 
    Dropdown, 
    TextButton, 
    Badge, 
    Loader, 
    TableListItem, 
    Card, 
    SkeletonLine, 
    SkeletonRectangle, 
    Button, 
    Popover, 
    SidePanel, 
    FormField 
} from '@wix/design-system';
import { 
    formatStatus, 
    getStatusSkin, 
    getPrioritySkin, 
    type TicketSla, 
    formatPriority, 
    getSlaSummary 
} from '@jrapps/my_tickets_common_types';
import type { TicketPriority, TicketStatus } from '@jrapps/my_tickets_common_types';
import { STATUS_OPTIONS } from '@jrapps/my_tickets_common_types';
import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useTicketsSidebar } from './useTicketsSidebar';
import SlaBadge from '../../common-components/sla-badge/sla-badge';
import './tickets-sidebar.css';

// Local status options with "No Filter" as the first option
const STATUS_OPTIONS_WITH_ALL = [
    { id: 'all', value: 'All' },
    ...STATUS_OPTIONS
];

const FILTERS_STORAGE_KEY = 'my-tickets:sidebar-filters';

const readSavedFilters = (): Record<string, string> => {
    try {
        const parsed = JSON.parse(window.localStorage.getItem(FILTERS_STORAGE_KEY) ?? '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const savedOption = (saved: Record<string, string>, key: string, defaultId: string) => {
    const id = typeof saved[key] === 'string' ? saved[key] : defaultId;
    return { id, value: id };
};

const TicketsSidebar = forwardRef<{ 
    updateTicket: (
        ticketId: string, 
        updates: { 
            status?: string; 
            priority?: string;
            isSpam?: boolean;
            isDeleted?: boolean;
            assignedAgent?: { id?: string; name?: string };
            assignedTeam?: { id?: string; name?: string };
        }
    ) => void 
}, { 
    permissions: string[]; 
    teamId: string; 
    onClick: (ticketId: string) => void; 
    onVisibleTicketsChange?: (ticketIds: string[]) => void;
    onTicketUpdate?: (
        ticketId: string, 
        updates: { 
            status?: string; 
            priority?: string;
            isSpam?: boolean;
            isDeleted?: boolean;
            assignedAgent?: { id?: string; name?: string };
            assignedTeam?: { id?: string; name?: string };
        }
    ) => void 
}>(({ 
    permissions, 
    teamId, 
    onClick,
    onVisibleTicketsChange
}, ref) => {
    const [saved] = useState(readSavedFilters);
    const [selectedStatus, setSelectedStatus] = useState<{ id: string | number; value: any }>(() => savedOption(saved, 'status', 'all'));
    const [selectedAssignee, setSelectedAssignee] = useState<{ id: string | number; value: any }>(() => savedOption(saved, 'assignee', 'all'));
    const [selectedTeam, setSelectedTeam] = useState<{ id: string | number; value: any }>(() => savedOption(saved, 'team', 'all'));
    const [selectedPriority, setSelectedPriority] = useState<{ id: string | number; value: any }>(() => savedOption(saved, 'priority', 'all'));
    const [selectedTag, setSelectedTag] = useState<{ id: string | number; value: any }>(() => savedOption(saved, 'tag', 'all'));
    const [selectedSla, setSelectedSla] = useState<{ id: string | number; value: any }>(() => savedOption(saved, 'sla', 'all'));
    const [selectedQueue, setSelectedQueue] = useState<{ id: string | number; value: any }>(() => savedOption(saved, 'queue', 'inbox'));
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

    const activeFilterCount = [selectedStatus, selectedAssignee, selectedTeam, selectedPriority, selectedTag, selectedSla].filter(filter => filter.id !== 'all').length + (selectedQueue.id !== 'inbox' ? 1 : 0);

    useEffect(() => {
        try {
            window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
                status: String(selectedStatus.id),
                assignee: String(selectedAssignee.id),
                team: String(selectedTeam.id),
                priority: String(selectedPriority.id),
                tag: String(selectedTag.id),
                sla: String(selectedSla.id),
                queue: String(selectedQueue.id),
            }));
        } catch {
            // Storage can be unavailable in restricted iframes; filters just won't persist.
        }
    }, [selectedStatus, selectedAssignee, selectedTeam, selectedPriority, selectedTag, selectedSla, selectedQueue]);

    const clearFilters = () => {
        const all = { id: 'all', value: 'All' };
        setSelectedStatus(all);
        setSelectedAssignee(all);
        setSelectedTeam(all);
        setSelectedPriority(all);
        setSelectedTag(all);
        setSelectedSla(all);
        setSelectedQueue({ id: 'inbox', value: 'Inbox' });
    };

    const { tickets, isLoading, isError, searchTerm, handleSearch, handleClear, updateTicket, loadMore, hasMore, isLoadingMore } = useTicketsSidebar(teamId);
    const assigneeOptions = [
        { id: 'all', value: 'All' },
        { id: 'unassigned', value: 'Unassigned' },
        ...Array.from(new Map(tickets.filter(ticket => ticket.assignedAgent?.id).map(ticket => [ticket.assignedAgent!.id!, { id: ticket.assignedAgent!.id!, value: ticket.assignedAgent!.name || 'Agent' }])).values()),
    ];
    const teamOptions = [
        { id: 'all', value: 'All' },
        ...Array.from(new Map(tickets.filter(ticket => ticket.assignedTeam?.id).map(ticket => [ticket.assignedTeam!.id!, { id: ticket.assignedTeam!.id!, value: ticket.assignedTeam!.name || 'Team' }])).values()),
    ];
    const priorityOptions = [{ id: 'all', value: 'All' }, ...Array.from(new Set(tickets.map(ticket => ticket.priority))).filter(Boolean).map(value => ({ id: value, value: formatPriority(value as TicketPriority) }))];
    const tagOptions = [{ id: 'all', value: 'All' }, ...Array.from(new Set(tickets.flatMap(ticket => ticket.tags || []))).map(value => ({ id: value, value }))];
    const queueOptions = [{ id: 'inbox', value: 'Inbox' }, { id: 'spam', value: 'Spam' }, { id: 'deleted', value: 'Deleted' }];
    const slaOptions = [{ id: 'all', value: 'All' }, { id: 'breached', value: 'Breached' }, { id: 'at_risk', value: 'At risk' }];
    const visibleTickets = tickets.filter(ticket =>
        (selectedQueue.id === 'spam' ? ticket.isSpam : selectedQueue.id === 'deleted' ? ticket.isDeleted : !ticket.isSpam && !ticket.isDeleted) &&
        (selectedStatus.id === 'all' || ticket.status === selectedStatus.id) &&
        (selectedAssignee.id === 'all' || (selectedAssignee.id === 'unassigned' ? !ticket.assignedAgent?.id : ticket.assignedAgent?.id === selectedAssignee.id)) &&
        (selectedTeam.id === 'all' || ticket.assignedTeam?.id === selectedTeam.id) &&
        (selectedPriority.id === 'all' || ticket.priority === String(selectedPriority.id)) &&
        (selectedTag.id === 'all' || ticket.tags?.includes(String(selectedTag.id))) &&
        (selectedSla.id === 'all' || getSlaSummary(ticket.sla)?.state === selectedSla.id)
    );
    const visibleTicketIds = visibleTickets.map(ticket => ticket._id);
    const visibleTicketIdsKey = JSON.stringify(visibleTicketIds);

    useEffect(() => {
        onVisibleTicketsChange?.(visibleTicketIds);
    }, [visibleTicketIdsKey, onVisibleTicketsChange]);

    useImperativeHandle(ref, () => ({
        updateTicket
    }), [updateTicket]);

    const TicketItem = ({
        primaryTicketId,
        ticketId,
        subject,
        status,
        priority,
        sla,
        onClick
    }: {
        primaryTicketId: string,
        ticketId: string,
        subject: string,
        status: string,
        priority: string;
        sla?: TicketSla;
        onClick: (ticketId: string) => void
    }) => {



        return (
            <TableListItem
                onClick={() => onClick(ticketId)}
                borderRadius='none'
                showDivider
                options={[
                    {
                        value: (
                            <Box direction="vertical" maxWidth={'100%'} minWidth={'100%'}>
                                <Text size='medium' weight='bold'>#{primaryTicketId}</Text>
                                <Text size="small" secondary ellipsis>
                                    {subject}
                                </Text>
                                {sla && <Box marginTop="4px"><SlaBadge sla={sla} compact /></Box>}
                            </Box>
                        ),
                    },
                    {
                        value: (
                            <Box direction='vertical' gap={1} minWidth={'70px'}>
                                <Badge skin={getStatusSkin(status as TicketStatus)} size='tiny'>{formatStatus(status as TicketStatus)}</Badge>
                                <Badge skin={getPrioritySkin(priority as TicketPriority)} size='tiny' >{formatPriority(priority as TicketPriority)}</Badge>
                            </Box>
                        ),
                        width: 'auto',
                    },
                ]}
            />
        )
    }

    const hasPermission = permissions && permissions.includes('my-tickets-view-single-ticket');

    return (
        <Box width="350px" height="100%" boxSizing="border-box">
            <Card className="tickets-sidebar-card" stretchVertically>
                <Card.Content size='none' dataHook='tickets-sidebar-card-content'>
                    {hasPermission && (
                        <Box width='100%' direction='vertical'>
                            <Box padding="10px" width="100%" boxSizing="border-box" gap="SP2" verticalAlign="middle">
                                <Box flex="1" minWidth={0}>
                                    <Search value={searchTerm} clearButton onChange={handleSearch} onClear={handleClear} />
                                </Box>
                                <Popover
                                    shown={isFilterPanelOpen}
                                    placement="right-start"
                                    appendTo="window"
                                    width={340}
                                    onClickOutside={() => setIsFilterPanelOpen(false)}
                                    onEscPress={() => setIsFilterPanelOpen(false)}
                                >
                                    <Popover.Element>
                                        <TextButton size="small" onClick={() => setIsFilterPanelOpen((open) => !open)}>{activeFilterCount > 0 ? `Filter (${activeFilterCount})` : 'Filter'}</TextButton>
                                    </Popover.Element>
                                    <Popover.Content>
                                        <SidePanel
                                            width="340px"
                                            height="100%"
                                            closeButtonProps={{ onClick: () => setIsFilterPanelOpen(false) }}
                                        >
                                            <SidePanel.Header title="Filter tickets" />
                                            <SidePanel.Content>
                                                <Box direction="vertical" gap="SP2">
                                                    <FormField label="Queue">
                                                        <Dropdown options={queueOptions} selectedId={selectedQueue.id} onSelect={(option) => setSelectedQueue({ id: option.id, value: option.value })} popoverProps={{ appendTo: 'parent' }} />
                                                    </FormField>
                                                    <FormField label="Status">
                                                        <Dropdown options={STATUS_OPTIONS_WITH_ALL} selectedId={selectedStatus.id} onSelect={(option) => setSelectedStatus({ id: option.id, value: option.value })} popoverProps={{ appendTo: 'parent' }} />
                                                    </FormField>
                                                    <FormField label="Assignee">
                                                        <Dropdown options={assigneeOptions} selectedId={selectedAssignee.id} onSelect={(option) => setSelectedAssignee({ id: option.id, value: option.value })} popoverProps={{ appendTo: 'parent' }} />
                                                    </FormField>
                                                    <FormField label="Team">
                                                        <Dropdown options={teamOptions} selectedId={selectedTeam.id} onSelect={(option) => setSelectedTeam({ id: option.id, value: option.value })} popoverProps={{ appendTo: 'parent' }} />
                                                    </FormField>
                                                    <FormField label="Priority">
                                                        <Dropdown options={priorityOptions} selectedId={selectedPriority.id} onSelect={(option) => setSelectedPriority({ id: option.id, value: option.value })} popoverProps={{ appendTo: 'parent' }} />
                                                    </FormField>
                                                    <FormField label="Tag">
                                                        <Dropdown options={tagOptions} selectedId={selectedTag.id} onSelect={(option) => setSelectedTag({ id: option.id, value: option.value })} popoverProps={{ appendTo: 'parent' }} />
                                                    </FormField>
                                                    <FormField label="SLA">
                                                        <Dropdown options={slaOptions} selectedId={selectedSla.id} onSelect={(option) => setSelectedSla({ id: option.id, value: option.value })} popoverProps={{ appendTo: 'parent' }} />
                                                    </FormField>
                                                    {activeFilterCount > 0 && (
                                                        <Box><TextButton size="small" onClick={clearFilters}>Clear filters</TextButton></Box>
                                                    )}
                                                </Box>
                                            </SidePanel.Content>
                                        </SidePanel>
                                    </Popover.Content>
                                </Popover>
                            </Box>
                            <Divider direction="horizontal" />
                        </Box>
                    )}
                    <Box
                        width="100%"
                        flex="1"
                        minHeight={0}
                        flexGrow={1}
                        maxHeight="100%"
                        direction="vertical"
                        overflowY="auto"
                    >
                        {!hasPermission && !isError && (
                            <Box width='100%' height='100%' verticalAlign="middle" align="center">
                                <Loader status="error" text='You do not have the necessary permissions to view the tickets' />
                            </Box>
                        )}
                        {isLoading && hasPermission && (
                            <Box width='100%' height='100%' direction="vertical" padding={2} boxSizing='border-box' gap={6}>
                                {/* create 5 sceletons */}
                                {[...Array(5)].map((_, index) => (
                                    <Box key={index} direction='vertical' width='100%' gap={1} boxSizing='border-box'>
                                        <Box width='100%' WebkitJustifyContent='space-between'>
                                            <SkeletonLine width='100px' />
                                            <SkeletonRectangle width='100px' height='15px' />

                                        </Box>
                                        <Box width='100%' WebkitJustifyContent='space-between'>
                                            <SkeletonLine width='50px' />
                                            <SkeletonRectangle width='100px' height='15px' />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}
                        {isError && (
                            <Box width='100%' height='100%' verticalAlign="middle" align="center">
                                <Loader size="small" status="error" text='Failed to load tickets' />
                            </Box>
                        )}
                        {!isLoading && !isError && hasPermission && visibleTickets.length === 0 && (
                            <Box width="100%" padding="10px" align="center">
                                <Text size="small">No tickets available</Text>
                            </Box>
                        )}
                        {hasPermission && !isLoading && !isError && visibleTickets
                            .map(({ primaryTicketId, subject, status, _id, priority, sla }) => (
                                <TicketItem
                                    key={_id}
                                    primaryTicketId={primaryTicketId}
                                    ticketId={_id}
                                    subject={subject}
                                    status={status}
                                    onClick={onClick}
                                    priority={priority}
                                    sla={sla}
                                />
                            ))}
                        {hasPermission && !isLoading && hasMore && !searchTerm && (
                            <Box width="100%" padding="10px" align="center">
                                <Button size="small" onClick={loadMore} disabled={isLoadingMore}>{isLoadingMore ? <Loader size="tiny" /> : 'Load more tickets'}</Button>
                            </Box>
                        )}
                    </Box>
                </Card.Content>
            </Card>
        </Box>
    );
});

TicketsSidebar.displayName = 'TicketsSidebar';

export default TicketsSidebar;

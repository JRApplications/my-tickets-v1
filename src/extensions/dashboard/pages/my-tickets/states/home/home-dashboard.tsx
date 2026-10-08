import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { AreaChart, Badge, Box, Button, Card, Cell, Heading, Layout, LinearProgressBar, Page, SkeletonRectangle, TableListItem, Text } from '@wix/design-system';
import { Add, Inbox } from '@wix/wix-ui-icons-common/odeditor';
import {
    getPrioritySkin,
    formatPriority,
    formatStatus,
    getStatusSkin,
    type TicketPriority,
    type TicketStatus,
    StateId
} from '@jrapps/my_tickets_common_types';
import './home-dashboard.css';

interface DashboardTicket {
    _id: string;
    primaryTicketId?: string;
    primaryTicketNumber?: string;
    subject?: string;
    status?: string;
    priority?: string;
}

interface TicketAnalytics {
    totalTickets: number;
    ticketVolumeLast30Days: number;
    newTicketsLast30Days: number;
    openTickets: number;
    closedTickets: number;
    averageFirstResponseHours: number | null;
    averageResolutionHours: number | null;
    responseSamples: number;
    resolutionSamples: number;
    sla?: {
        tracked: number;
        firstResponseMetPct: number | null;
        firstResponseMeasured: number;
        resolutionMetPct: number | null;
        resolutionMeasured: number;
        atRisk: number;
        breachedOpen: number;
        breachesLast30Days: number;
        escalated: number;
        byPriority: Array<{ priority: string; tracked: number; breached: number }>;
    };
    statusCounts: Record<string, number>;
    priorityCounts: Record<string, number>;
    ticketsPerAgent: Array<{ agentId: string; name: string; count: number }>;
    ticketsPerTeam: Array<{
        teamId: string;
        name: string;
        count: number;
        openTickets: number;
        averageFirstResponseHours: number | null;
        averageResolutionHours: number | null;
        slaMetPct: number | null;
        slaMeasured: number;
    }>;
    volumeForecast?: {
        history: Array<{ date: string; value: number }>;
        forecast: Array<{ date: string; value: number }>;
        averageDailyVolume: number;
        projectedNext7Days: number;
        trendDirection: 'increasing' | 'decreasing' | 'steady';
        method: string;
    };
}

interface HomeDashboardProps {
    teamId: string;
    onCreateTicket: () => void;
    onNavigate: (stateId: StateId) => void;
    onTicketClick: (ticketId: string) => void;
}

const normalize = (value?: string) => (value ?? '').toLowerCase().replace(/[ _-]/g, '');

interface HomeDashboardCacheEntry {
    tickets?: DashboardTicket[];
    analytics?: TicketAnalytics;
}

const homeDashboardCache = new Map<string, HomeDashboardCacheEntry>();

const HomeDashboard = ({ teamId, onCreateTicket, onNavigate, onTicketClick }: HomeDashboardProps) => {
    const initialCache = homeDashboardCache.get(teamId);
    const [tickets, setTickets] = useState<DashboardTicket[]>(initialCache?.tickets ?? []);
    const [isLoading, setIsLoading] = useState(initialCache?.tickets === undefined);
    const [hasError, setHasError] = useState(false);
    const [analytics, setAnalytics] = useState<TicketAnalytics | null>(initialCache?.analytics ?? null);
    const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(initialCache?.analytics === undefined);
    const loadRequestId = useRef(0);

    const loadTickets = useCallback(async () => {
        const requestId = ++loadRequestId.current;
        if (!teamId) {
            setTickets([]);
            setIsLoading(false);
            setHasError(false);
            setAnalytics(null);
            setIsAnalyticsLoading(false);
            return;
        }
        const cached = homeDashboardCache.get(teamId);
        setTickets(cached?.tickets ?? []);
        setAnalytics(cached?.analytics ?? null);
        setIsLoading(cached?.tickets === undefined);
        setIsAnalyticsLoading(cached?.analytics === undefined);
        setHasError(false);
        const baseApiUrl = new URL(import.meta.url).origin;

        const refreshTickets = async () => {
            try {
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/sidebar/get?teamId=${encodeURIComponent(teamId)}`);
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load ticket overview');
                if (requestId !== loadRequestId.current) return;
                const freshTickets = (result.tickets ?? []) as DashboardTicket[];
                setTickets(freshTickets);
                homeDashboardCache.set(teamId, { ...homeDashboardCache.get(teamId), tickets: freshTickets });
            } catch (error) {
                console.error('Failed to refresh home dashboard tickets', error);
                if (requestId === loadRequestId.current && !cached?.tickets) setHasError(true);
            } finally {
                if (requestId === loadRequestId.current) setIsLoading(false);
            }
        };

        const refreshAnalytics = async () => {
            try {
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/analytics?teamId=${encodeURIComponent(teamId)}`);
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load ticket analytics');
                if (requestId !== loadRequestId.current) return;
                const freshAnalytics = result.metrics as TicketAnalytics;
                setAnalytics(freshAnalytics);
                homeDashboardCache.set(teamId, { ...homeDashboardCache.get(teamId), analytics: freshAnalytics });
            } catch (error) {
                console.error('Failed to refresh home dashboard analytics', error);
            } finally {
                if (requestId === loadRequestId.current) setIsAnalyticsLoading(false);
            }
        };

        await Promise.all([refreshTickets(), refreshAnalytics()]);
    }, [teamId]);

    useEffect(() => { void loadTickets(); }, [loadTickets]);

    const metrics = useMemo(() => {
        const statusCounts = tickets.reduce<Record<string, number>>((counts, ticket) => {
            const key = normalize(ticket.status);
            counts[key] = (counts[key] ?? 0) + 1;
            return counts;
        }, {});
        const priorityCounts = tickets.reduce<Record<string, number>>((counts, ticket) => {
            const key = normalize(ticket.priority);
            counts[key] = (counts[key] ?? 0) + 1;
            return counts;
        }, {});
        return {
            open: analytics?.statusCounts.open ?? statusCounts.open ?? 0,
            inProgress: analytics?.statusCounts.in_progress ?? statusCounts.inprogress ?? 0,
            completed: analytics?.closedTickets ?? (statusCounts.resolved ?? 0) + (statusCounts.closed ?? 0),
            urgent: analytics?.priorityCounts.urgent ?? priorityCounts.urgent ?? 0,
            high: analytics?.priorityCounts.high ?? priorityCounts.high ?? 0,
            priorityCounts: analytics?.priorityCounts ?? priorityCounts,
            statusCounts: analytics?.statusCounts ?? statusCounts,
        };
    }, [tickets, analytics]);

    const statusItems = [
        { label: 'Open', key: 'open', count: metrics.statusCounts.open ?? 0 },
        { label: 'In progress', key: 'inprogress', count: metrics.statusCounts.inprogress ?? 0 },
        { label: 'Resolved', key: 'resolved', count: metrics.statusCounts.resolved ?? 0 },
        { label: 'Closed', key: 'closed', count: metrics.statusCounts.closed ?? 0 },
    ];
    const total = analytics?.totalTickets ?? tickets.length;
    const formatPct = (pct: number | null | undefined) => pct == null ? 'No data yet' : `${pct}%`;
    const formatHours = (hours: number | null | undefined) => hours == null ? 'Not enough data' : hours < 1 ? `${Math.round(hours * 60)} min` : `${hours.toFixed(1)} hrs`;

    return (
        <Page maxWidth={9999} className="home-dashboard-page">
            <Page.Header
                title="Home"
                subtitle="A clear view of your team's ticket workload."
                actionsBar={<Box gap="SP2"><Button priority="secondary" prefixIcon={<Inbox />} onClick={() => onNavigate(StateId.ViewTickets)}>View tickets</Button><Button prefixIcon={<Add />} onClick={onCreateTicket}>Create ticket</Button></Box>}
            />
            <Page.Content>
                <Box direction="vertical" gap="SP4">
                    <Box direction="vertical" gap="SP1">
                        <Heading size="medium">Ticket overview</Heading>
                        <Text secondary>Total tickets currently available to your team</Text>
                    </Box>

                    {hasError && (
                        <Card>
                            <Card.Content>
                                <Box verticalAlign="middle" gap="SP3">
                                    <Text>Ticket analytics couldn’t be loaded.</Text>
                                    <Button size="small" priority="secondary" onClick={() => void loadTickets()}>Try again</Button>
                                </Box>
                            </Card.Content>
                        </Card>
                    )}

                    <Layout cols={12} gap="24px">
                        {[
                            { label: 'Open tickets', value: metrics.open, detail: 'Awaiting a response' },
                            { label: 'In progress', value: metrics.inProgress, detail: 'Being worked on' },
                            { label: 'Resolved & closed', value: metrics.completed, detail: 'Completed tickets' },
                            { label: 'Urgent priority', value: metrics.urgent, detail: `${metrics.high} high priority` },
                        ].map((metric) => (
                            <Cell key={metric.label} span={3}>
                                <Card>
                                    <Card.Content>
                                        <Box direction="vertical" gap="SP2">
                                            <Text secondary>{metric.label}</Text>
                                            {isLoading ? <SkeletonRectangle width="64px" height="36px" /> : <Heading size="large">{metric.value.toLocaleString()}</Heading>}
                                            <Text size="small" secondary>{metric.detail}</Text>
                                        </Box>
                                    </Card.Content>
                                </Card>
                            </Cell>
                        ))}
                    </Layout>

                    <Layout cols={12} gap="24px">
                        <Cell span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>New tickets (30 days)</Text>{isAnalyticsLoading ? <SkeletonRectangle width="64px" height="36px" /> : <Heading size="large">{analytics?.newTicketsLast30Days ?? 0}</Heading>}<Text size="tiny" secondary>Created in the last 30 days</Text></Box></Card.Content></Card></Cell>
                        <Cell span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>Total ticket volume</Text>{isAnalyticsLoading ? <SkeletonRectangle width="64px" height="36px" /> : <Heading size="large">{analytics?.ticketVolumeLast30Days ?? 0}</Heading>}<Text size="tiny" secondary>Across all statuses · last 30 days</Text></Box></Card.Content></Card></Cell>
                        <Cell span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>Average first response</Text>{isAnalyticsLoading ? <SkeletonRectangle width="100px" height="36px" /> : <Heading size="medium">{formatHours(analytics?.averageFirstResponseHours)}</Heading>}<Text size="tiny" secondary>{analytics?.responseSamples ?? 0} tickets with a response</Text></Box></Card.Content></Card></Cell>
                        <Cell span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>Average resolution</Text>{isAnalyticsLoading ? <SkeletonRectangle width="100px" height="36px" /> : <Heading size="medium">{formatHours(analytics?.averageResolutionHours)}</Heading>}<Text size="tiny" secondary>{analytics?.resolutionSamples ?? 0} resolved tickets measured</Text></Box></Card.Content></Card></Cell>
                    </Layout>

                    {analytics?.sla && analytics.sla.tracked > 0 && (
                        <Box direction="vertical" gap="SP2">
                            <Heading size="medium">SLA health</Heading>
                            <Layout cols={12} gap="24px">
                                <Cell span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>First response met</Text><Heading size="large">{formatPct(analytics.sla.firstResponseMetPct)}</Heading><Text size="tiny" secondary>{analytics.sla.firstResponseMeasured} tickets measured</Text></Box></Card.Content></Card></Cell>
                                <Cell span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>Resolution met</Text><Heading size="large">{formatPct(analytics.sla.resolutionMetPct)}</Heading><Text size="tiny" secondary>{analytics.sla.resolutionMeasured} tickets measured</Text></Box></Card.Content></Card></Cell>
                                <Cell span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>At risk now</Text><Heading size="large">{analytics.sla.atRisk}</Heading><Text size="tiny" secondary>{analytics.sla.breachedOpen} already overdue</Text></Box></Card.Content></Card></Cell>
                                <Cell span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>Breaches (30 days)</Text><Heading size="large">{analytics.sla.breachesLast30Days}</Heading><Text size="tiny" secondary>{analytics.sla.escalated} tickets escalated</Text></Box></Card.Content></Card></Cell>
                            </Layout>
                        </Box>
                    )}

                    <Card>
                        <Card.Header title="Ticket volume forecast" subtitle={analytics?.volumeForecast?.method ? `Projection from the previous 30 days · ${analytics.volumeForecast.method}` : 'Ticket volume history and demand estimate'} />
                        <Card.Content>
                            {isAnalyticsLoading ? <SkeletonRectangle width="100%" height="240px" /> : analytics?.volumeForecast ? (
                                <Layout cols={12} gap="24px">
                                    <Cell span={6}>
                                        <Box direction="vertical" gap="SP2">
                                            <Text weight="bold">Actual tickets per day</Text>
                                            <AreaChart data={analytics.volumeForecast.history.map((day) => ({
                                                value: day.value,
                                                label: new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
                                            }))} tooltipContent={(item) => `${item.value} tickets`} />
                                            <Text size="small" secondary>Average: {analytics.volumeForecast.averageDailyVolume} tickets per day</Text>
                                        </Box>
                                    </Cell>
                                    <Cell span={6}>
                                        <Box direction="vertical" gap="SP2">
                                            <Box verticalAlign="middle" align="space-between"><Text weight="bold">Projected next 7 days</Text><Button size="small" priority="secondary" onClick={() => onNavigate(StateId.Workforce)}>Plan capacity</Button></Box>
                                            <AreaChart data={analytics.volumeForecast.forecast.map((day) => ({
                                                value: day.value,
                                                label: new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
                                            }))} tooltipContent={(item) => `${item.value} projected tickets`} />
                                            <Text size="small" secondary>{analytics.volumeForecast.projectedNext7Days} projected tickets · trend {analytics.volumeForecast.trendDirection}. Estimates use a linear trend across 30 days of ticket creation history.</Text>
                                        </Box>
                                    </Cell>
                                </Layout>
                            ) : <Text secondary>There isn’t enough ticket history to create a forecast.</Text>}
                        </Card.Content>
                    </Card>

                    <Layout cols={12} gap="24px">
                        <Cell span={6}>
                            <Card>
                                <Card.Header title="Tickets by status" subtitle={isLoading ? 'Loading ticket data…' : `${total.toLocaleString()} tickets in your current workload`} />
                                <Card.Content>
                                    {isLoading ? <Box direction="vertical" gap="SP3"><SkeletonRectangle height="18px" /><SkeletonRectangle height="18px" /><SkeletonRectangle height="18px" /></Box> : total === 0 ? (
                                        <Box direction="vertical" gap="SP2">
                                            <Text>No tickets to show yet.</Text>
                                            <Button priority="secondary" onClick={onCreateTicket}>Create your first ticket</Button>
                                        </Box>
                                    ) : (
                                        <Box direction="vertical" gap="SP3">
                                            {statusItems.map(({ label, key, count }) => {
                                                const percent = Math.round((count / total) * 100);
                                                return <Box direction="vertical" gap="SP1" key={key}>
                                                    <Box verticalAlign="middle" gap="SP2" align="space-between"><Text>{label}</Text><Text secondary>{count.toLocaleString()} ({percent}%)</Text></Box>
                                                    <LinearProgressBar value={percent} showProgressIndication={false} aria-label={`${label}: ${count} tickets`} />
                                                </Box>;
                                            })}
                                        </Box>
                                    )}
                                </Card.Content>
                            </Card>
                        </Cell>
                        <Cell span={6}>
                            <Card>
                                <Card.Header title="Priority breakdown" subtitle="Tickets that may need attention" />
                                <Card.Content>
                                    {isLoading ? <Box direction="vertical" gap="SP3"><SkeletonRectangle height="24px" /><SkeletonRectangle height="24px" /><SkeletonRectangle height="24px" /><SkeletonRectangle height="24px" /></Box> : (
                                        <Box direction="vertical" gap="SP3">
                                            {[
                                                { label: 'Urgent', key: 'urgent', count: metrics.urgent, skin: 'danger' as const },
                                                { label: 'High', key: 'high', count: metrics.high, skin: 'warning' as const },
                                                { label: 'Medium', key: 'medium', count: metrics.priorityCounts.medium ?? 0, skin: 'standard' as const },
                                                { label: 'Low', key: 'low', count: metrics.priorityCounts.low ?? 0, skin: 'neutral' as const },
                                            ].map(({ label, key, count, skin }) => <Box key={key} verticalAlign="middle" align="space-between"><Text>{label}</Text><Badge skin={skin}>{count.toLocaleString()}</Badge></Box>)}
                                        </Box>
                                    )}
                                </Card.Content>
                            </Card>
                        </Cell>
                        <Cell span={6}><Card><Card.Header title="Tickets per agent" /><Card.Content><Box direction="vertical" gap="SP2">{isAnalyticsLoading ? <SkeletonRectangle height="24px" /> : analytics?.ticketsPerAgent.length ? analytics.ticketsPerAgent.slice(0, 8).map((row) => <Box key={row.agentId} align="space-between"><Text>{row.name}</Text><Badge>{row.count}</Badge></Box>) : <Text secondary>No assigned tickets yet</Text>}</Box></Card.Content></Card></Cell>
                        <Cell span={12}>
                            <Card>
                                <Card.Header title="Team performance" subtitle="Workload, response speed, and SLA results by assigned team" />
                                <Card.Content>
                                    {isAnalyticsLoading ? (
                                        <Box direction="vertical" gap="SP3">
                                            <SkeletonRectangle height="72px" />
                                            <SkeletonRectangle height="72px" />
                                            <SkeletonRectangle height="72px" />
                                        </Box>
                                    ) : analytics?.ticketsPerTeam.length ? (
                                        <Box direction="vertical" gap="SP3">
                                            {analytics.ticketsPerTeam.map((row) => (
                                                <Box key={row.teamId} direction="vertical" gap="SP2" paddingBottom="SP3" borderBottom="1px solid #DFE5EB">
                                                    <Box verticalAlign="middle" align="space-between">
                                                        <Text weight="bold">{row.name}</Text>
                                                        <Badge>{row.count} tickets</Badge>
                                                    </Box>
                                                    <Layout cols={12} gap="SP3">
                                                        <Cell span={3}><Box direction="vertical" gap="SP1"><Text size="tiny" secondary>Open workload</Text><Text>{row.openTickets}</Text></Box></Cell>
                                                        <Cell span={3}><Box direction="vertical" gap="SP1"><Text size="tiny" secondary>Avg. first response</Text><Text>{formatHours(row.averageFirstResponseHours)}</Text></Box></Cell>
                                                        <Cell span={3}><Box direction="vertical" gap="SP1"><Text size="tiny" secondary>Avg. resolution</Text><Text>{formatHours(row.averageResolutionHours)}</Text></Box></Cell>
                                                        <Cell span={3}><Box direction="vertical" gap="SP1"><Text size="tiny" secondary>SLA met</Text><Text>{formatPct(row.slaMetPct)}{row.slaMeasured ? ` · ${row.slaMeasured} measured` : ''}</Text></Box></Cell>
                                                    </Layout>
                                                </Box>
                                            ))}
                                        </Box>
                                    ) : <Text secondary>No team tickets yet</Text>}
                                </Card.Content>
                            </Card>
                        </Cell>

                        <Cell span={12}><Card>
                            <Card.Header title="Recent tickets" subtitle="Open a ticket to continue the conversation" />
                            <Card.Content>
                                {isLoading ? <Box direction="vertical" gap="SP3"><SkeletonRectangle height="48px" /><SkeletonRectangle height="48px" /><SkeletonRectangle height="48px" /></Box> : tickets.length === 0 ? <Text secondary>Your recent tickets will appear here.</Text> : (
                                    <Box direction="vertical">
                                        {tickets.slice(0, 5).map((ticket) => <TableListItem
                                            key={ticket._id}
                                            onClick={() => onTicketClick(ticket._id)}
                                            ariaLabel={`Open ticket ${ticket.subject || ticket.primaryTicketId || ticket._id}`}
                                            options={[
                                                {
                                                    value: (
                                                        <Box direction="vertical" maxWidth="100%" minWidth="100%">
                                                            <Text size="medium" weight="bold">#{ticket.primaryTicketId || ticket.primaryTicketNumber || ticket._id}</Text>
                                                            <Text size="small" secondary ellipsis>{ticket.subject || 'Untitled ticket'}</Text>
                                                        </Box>
                                                    ),
                                                },
                                                {
                                                    value: (
                                                        <Box direction="vertical" gap={1} minWidth="70px">
                                                            <Badge skin={getStatusSkin((ticket.status || 'open') as TicketStatus)} size="tiny">{formatStatus((ticket.status || 'open') as TicketStatus)}</Badge>
                                                            <Badge skin={getPrioritySkin((ticket.priority || 'low') as TicketPriority)} size="tiny">{formatPriority((ticket.priority || 'low') as TicketPriority)}</Badge>
                                                        </Box>
                                                    ),
                                                    width: 'auto',
                                                },
                                            ]}
                                            verticalPadding="medium"
                                            showDivider
                                        />)}
                                    </Box>
                                )}
                            </Card.Content>
                        </Card></Cell>
                    </Layout>
                </Box>
            </Page.Content>
        </Page>
    );
};

export default HomeDashboard;

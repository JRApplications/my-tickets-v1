import { useCallback, useEffect, useMemo, useState } from 'react';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { AreaChart, Badge, Box, Button, Card, Cell, Heading, Layout, LinearProgressBar, Page, SkeletonRectangle, Text } from '@wix/design-system';
import { PermissionDeniedState } from '@jrapps/my_tickets_dashboard_ui';
import './workforce-dashboard.css';

interface WorkforceAgent {
    id: string;
    name: string;
    activeTickets: number;
}

interface WorkforceOverview {
    agents: WorkforceAgent[];
    activeTicketCount: number;
}

interface VolumeForecast {
    forecast: Array<{ date: string; value: number }>;
    averageDailyVolume: number;
    projectedNext7Days: number;
    trendDirection: 'increasing' | 'decreasing' | 'steady';
    method: string;
}

interface WorkforceDashboardProps {
    teamId: string;
    agentId: string;
    permissions: string[];
}

const WorkforceDashboard = ({ teamId, agentId, permissions }: WorkforceDashboardProps) => {
    const canView = permissions.includes('my-tickets-view-workforce');
    const [overview, setOverview] = useState<WorkforceOverview>({ agents: [], activeTicketCount: 0 });
    const [forecast, setForecast] = useState<VolumeForecast | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    const loadData = useCallback(async () => {
        if (!teamId || !agentId || !canView) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(false);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const [overviewResponse, analyticsResponse] = await Promise.all([
                myTicketsFetchWithAuth(`${baseApiUrl}/api/workforce/overview?teamId=${encodeURIComponent(teamId)}&agentId=${encodeURIComponent(agentId)}`),
                myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/analytics?teamId=${encodeURIComponent(teamId)}`),
            ]);
            const [overviewResult, analyticsResult] = await Promise.all([overviewResponse.json(), analyticsResponse.json()]);
            if (!overviewResponse.ok || !overviewResult.success) throw new Error(overviewResult.error || 'Unable to load workforce data');
            setOverview(overviewResult);
            if (analyticsResponse.ok && analyticsResult.success) setForecast(analyticsResult.metrics?.volumeForecast || null);
        } catch (loadError) {
            console.error('Failed to load workforce overview', loadError);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [teamId, agentId, canView]);

    useEffect(() => { void loadData(); }, [loadData]);

    const capacity = useMemo(() => {
        const agentCount = overview.agents.length;
        return {
            averageTicketsPerAgent: agentCount ? Math.round((overview.activeTicketCount / agentCount) * 10) / 10 : null,
            busiestAgent: overview.agents.reduce<WorkforceAgent | null>((busiest, agent) =>
                !busiest || agent.activeTickets > busiest.activeTickets ? agent : busiest, null),
        };
    }, [overview.agents, overview.activeTicketCount]);

    const forecastChartData = useMemo(() => (forecast?.forecast || []).map((day) => ({
        value: day.value,
        label: new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
    })), [forecast]);

    if (!canView) {
        return (
            <PermissionDeniedState />
        );
    }

    return (
        <Page maxWidth={9999} className="workforce-dashboard-page">
            <Page.Header title="Workforce" subtitle="Plan team coverage against current ticket workload and projected demand." />
            <Page.Content>
                <Box direction="vertical" gap="SP4">
                    {error && <Card><Card.Content><Box verticalAlign="middle" gap="SP3"><Text>Workforce data couldn’t be loaded.</Text><Button size="small" priority="secondary" onClick={() => void loadData()}>Try again</Button></Box></Card.Content></Card>}

                    <Layout cols={12} gap="24px">
                        <Cell span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>Open team tickets</Text>{isLoading ? <SkeletonRectangle width="70px" height="34px" /> : <Heading size="large">{overview.activeTicketCount}</Heading>}<Text size="small" secondary>Current uncompleted workload</Text></Box></Card.Content></Card></Cell>
                        <Cell span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>Team agents</Text>{isLoading ? <SkeletonRectangle width="70px" height="34px" /> : <Heading size="large">{overview.agents.length}</Heading>}<Text size="small" secondary>Agents available for ticket work</Text></Box></Card.Content></Card></Cell>
                        <Cell span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>Average open tickets per agent</Text>{isLoading ? <SkeletonRectangle width="90px" height="34px" /> : <Heading size="large">{capacity.averageTicketsPerAgent ?? '—'}</Heading>}<Text size="small" secondary>Current team workload divided across agents</Text></Box></Card.Content></Card></Cell>
                        <Cell span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>Highest current workload</Text>{isLoading ? <SkeletonRectangle width="90px" height="34px" /> : <Heading size="large">{capacity.busiestAgent?.activeTickets ?? '—'}</Heading>}<Text size="small" secondary>{capacity.busiestAgent?.name || 'No agent workload yet'}</Text></Box></Card.Content></Card></Cell>
                    </Layout>

                    <Layout cols={12} gap="24px">
                        <Cell span={5}>
                            <Card>
                                <Card.Header title="Ticket demand forecast" subtitle={`Next 7 days · ${forecast?.method || 'Loading trend'}`} />
                                <Card.Content>
                                    {isLoading ? <SkeletonRectangle width="100%" height="220px" /> : forecastChartData.length ? (
                                        <Box direction="vertical" gap="SP2">
                                            <AreaChart data={forecastChartData} tooltipContent={(item) => `${item.value} projected tickets`} />
                                            <Text size="small" secondary>
                                                {forecast?.projectedNext7Days ?? 0} tickets projected · {forecast?.averageDailyVolume ?? 0} actual tickets/day on average · trend {forecast?.trendDirection || 'steady'}
                                            </Text>
                                        </Box>
                                    ) : <Text secondary>There isn’t enough ticket history to create a forecast.</Text>}
                                </Card.Content>
                            </Card>
                        </Cell>
                        <Cell span={7}>
                            <Card>
                                <Card.Header title="Team capacity by agent" subtitle="Current open ticket workload across the team" />
                                <Card.Content>
                                    {isLoading ? <Box direction="vertical" gap="SP3"><SkeletonRectangle height="44px" /><SkeletonRectangle height="44px" /><SkeletonRectangle height="44px" /></Box> : overview.agents.length ? (
                                        <Box direction="vertical" gap="SP3">
                                            {overview.agents.map((agent) => {
                                                const openLoad = overview.activeTicketCount ? Math.round(agent.activeTickets / overview.activeTicketCount * 100) : 0;
                                                return <Box key={agent.id} direction="vertical" gap="SP1" verticalAlign="middle">
                                                    <Box verticalAlign="middle" height='100%' align="space-between"><Text weight="bold">{agent.name}</Text><Badge>{agent.activeTickets} open tickets</Badge></Box>
                                                    <LinearProgressBar value={openLoad} showProgressIndication={false} aria-label={`${agent.name}: ${openLoad}% of team open tickets`} />
                                                </Box>;
                                            })}
                                        </Box>
                                    ) : <Text secondary>No agents are assigned to this team.</Text>}
                                </Card.Content>
                            </Card>
                        </Cell>
                    </Layout>

                </Box>
            </Page.Content>
        </Page>
    );
};

export default WorkforceDashboard;

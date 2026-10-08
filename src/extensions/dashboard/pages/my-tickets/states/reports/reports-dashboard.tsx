import { useCallback, useEffect, useMemo, useState } from 'react';
import { AreaChart, Box, Button, Card, Cell, Checkbox, Dropdown, FormField, Heading, Input, Layout, Page, SectionHelper, SkeletonRectangle, Text } from '@wix/design-system';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { downloadFile, buildExportFilename } from './helpers/downloadFile';
import { buildReportCsv } from './helpers/buildReportCsv';
import { buildReportHtml } from './helpers/buildReportHtml';
import type { ReportExportInput } from './helpers/reportExportTypes';
import './reports-dashboard.css';

interface ReportMetrics {
    periodDays: number | null;
    totalTickets: number;
    ticketVolumeLast30Days: number;
    openTickets: number;
    closedTickets: number;
    averageFirstResponseHours: number | null;
    averageResolutionHours: number | null;
    statusCounts: Record<string, number>;
    priorityCounts: Record<string, number>;
    sla?: { tracked: number; firstResponseMetPct: number | null; resolutionMetPct: number | null; atRisk: number; breachedOpen: number; breachesLast30Days: number };
    volumeForecast?: { history: Array<{ date: string; value: number }> };
    ticketsPerAgent: Array<{ agentId: string; name: string; count: number }>;
    ticketsPerTeam: Array<{ teamId: string; name: string; count: number; openTickets: number; slaMetPct: number | null }>;
}

const REPORT_PERMISSION = 'my-tickets-view-reports';
type BreakdownKind = 'none' | 'team' | 'agent' | 'status' | 'priority';
const PERIOD_OPTIONS = [
    { id: '7', value: 'Last 7 days' },
    { id: '30', value: 'Last 30 days' },
    { id: '90', value: 'Last 90 days' },
    { id: '365', value: 'Last 12 months' },
];
const REPORT_FIELDS: Array<{ id: keyof ReportMetrics | 'firstResponseSla' | 'resolutionSla' | 'slaAtRisk' | 'slaBreaches'; label: string; value: (metrics: ReportMetrics) => string | number }> = [
    { id: 'totalTickets', label: 'Tickets in selected period', value: (m) => m.totalTickets },
    { id: 'openTickets', label: 'Open tickets', value: (m) => m.openTickets },
    { id: 'closedTickets', label: 'Closed tickets', value: (m) => m.closedTickets },
    { id: 'averageFirstResponseHours', label: 'Average first response (hours)', value: (m) => m.averageFirstResponseHours == null ? 'No data' : m.averageFirstResponseHours.toFixed(1) },
    { id: 'averageResolutionHours', label: 'Average resolution (hours)', value: (m) => m.averageResolutionHours == null ? 'No data' : m.averageResolutionHours.toFixed(1) },
    { id: 'firstResponseSla', label: 'First response SLA met (%)', value: (m) => m.sla?.firstResponseMetPct == null ? 'No data' : m.sla.firstResponseMetPct },
    { id: 'resolutionSla', label: 'Resolution SLA met (%)', value: (m) => m.sla?.resolutionMetPct == null ? 'No data' : m.sla.resolutionMetPct },
    { id: 'sla', label: 'SLA cases tracked', value: (m) => m.sla?.tracked ?? 0 },
    { id: 'slaAtRisk', label: 'SLA cases at risk', value: (m) => m.sla?.atRisk ?? 0 },
    { id: 'slaBreaches', label: 'Open SLA breaches', value: (m) => m.sla?.breachedOpen ?? 0 },
];

const ReportsDashboard = ({ teamId, permissions }: { teamId: string; permissions: string[] }) => {
    const canView = permissions.includes(REPORT_PERMISSION);
    const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reportName, setReportName] = useState('Custom ticket report');
    const [periodDays, setPeriodDays] = useState('30');
    const [breakdown, setBreakdown] = useState<BreakdownKind>('none');
    const [selectedFields, setSelectedFields] = useState<string[]>(['totalTickets', 'openTickets', 'closedTickets', 'firstResponseSla', 'resolutionSla']);

    const loadReportData = useCallback(async () => {
        if (!canView || !teamId) { setLoading(false); return; }
        setLoading(true);
        setError(false);
        try {
            const apiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${apiUrl}/api/reports/analytics?teamId=${encodeURIComponent(teamId)}&periodDays=${periodDays}`);
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load reports');
            setMetrics(result.metrics as ReportMetrics);
        } catch (loadError) {
            console.error('Failed to load reports', loadError);
            setError(true);
        } finally { setLoading(false); }
    }, [canView, teamId, periodDays]);

    useEffect(() => { void loadReportData(); }, [loadReportData]);

    const customRows = useMemo(() => metrics ? REPORT_FIELDS.filter((field) => selectedFields.includes(field.id)).map((field) => ({ label: field.label, value: field.value(metrics) })) : [], [metrics, selectedFields]);
    const breakdownRows = useMemo(() => {
        if (!metrics) return [];
        if (breakdown === 'team') return metrics.ticketsPerTeam.map((row) => ({ label: row.name, count: row.count, openTickets: row.openTickets, slaMetPct: row.slaMetPct }));
        if (breakdown === 'agent') return metrics.ticketsPerAgent.map((row) => ({ label: row.name, count: row.count, openTickets: '', slaMetPct: '' }));
        const counts = breakdown === 'status' ? metrics.statusCounts : breakdown === 'priority' ? metrics.priorityCounts : {};
        return Object.entries(counts).map(([label, count]) => ({ label, count, openTickets: '', slaMetPct: '' }));
    }, [breakdown, metrics]);
    const downloadCustom = (format: 'report' | 'csv') => {
        if (!metrics || (!customRows.length && !breakdownRows.length)) return;
        const generatedAt = new Date();
        const input: ReportExportInput = {
            reportName,
            timeframeLabel: PERIOD_OPTIONS.find((option) => option.id === periodDays)?.value ?? `Last ${periodDays} days`,
            periodDays: Number(periodDays),
            generatedAt,
            summaryRows: customRows,
            breakdownKind: breakdown,
            breakdownRows,
        };
        const baseName = buildExportFilename(reportName, input.periodDays, generatedAt);
        if (format === 'csv') {
            downloadFile(`${baseName}.csv`, buildReportCsv(input), 'text/csv;charset=utf-8');
        } else {
            downloadFile(`${baseName}.html`, buildReportHtml(input), 'text/html;charset=utf-8');
        }
    };

    if (!canView) return <Page maxWidth={9999}><Page.Header title="Reports" /><Page.Content><SectionHelper skin="warning" title="Permission required">You need the View Reports permission to access reports.</SectionHelper></Page.Content></Page>;

    return <Page maxWidth={9999} className='reports-dashboard-page'>
        <Page.Header title="Reports" subtitle="Explore ticket volume, service levels, and performance by team, agent, status, and priority." />
        <Page.Content>
            <Box direction="vertical" gap="SP4">
                <Card>
                    <Card.Content>
                        <Box direction="vertical" gap="SP2">
                            <Box width="240px">
                                <FormField label="Timeframe">
                                    <Dropdown
                                        options={PERIOD_OPTIONS}
                                        selectedId={periodDays}
                                        onSelect={(option) => setPeriodDays(String(option.id))}
                                    />
                                </FormField>
                            </Box>
                            <Text
                                size="small"
                                secondary
                            >
                                Timeframes include tickets created during the selected period. Changing the timeframe refreshes the reports and custom export.
                            </Text>
                        </Box>
                    </Card.Content>
                </Card>
                {error && (
                    <SectionHelper
                        skin="danger"
                        title="Reports could not be loaded"
                    >
                        <Box
                            gap="SP3"
                            verticalAlign="middle"
                        >
                            <Text>Check your connection and try again.</Text>
                            <Button
                                size="small"
                                priority="secondary"
                                onClick={() => void loadReportData()}
                            >
                                Try again
                            </Button>
                        </Box>
                    </SectionHelper>
                )}
                <Heading size="medium">Overview</Heading>
                <Layout cols={12} gap="24px">
                    {[
                        [`Tickets · ${PERIOD_OPTIONS.find((option) => option.id === periodDays)?.value.toLowerCase()}`, metrics?.totalTickets],
                        ['New · last 30 days', metrics?.ticketVolumeLast30Days],
                        ['Open', metrics?.openTickets],
                        ['Closed', metrics?.closedTickets],
                    ].map(([label, value]) => <Cell key={String(label)} span={3}><Card><Card.Content><Box direction="vertical" gap="SP2"><Text secondary>{label}</Text>{loading ? <SkeletonRectangle width="72px" height="34px" /> : <Heading size="large">{value ?? '—'}</Heading>}</Box></Card.Content></Card></Cell>)}
                </Layout>
                <Layout cols={12} gap="24px">
                    <Cell span={7}>
                        <Card>
                            <Card.Header
                                title="Ticket trends"
                                subtitle={`Daily ticket volume · ${PERIOD_OPTIONS.find((option) => option.id === periodDays)?.value.toLowerCase()}`}
                            />
                            <Card.Content>
                                {loading ?
                                    <SkeletonRectangle width="100%" height="220px" />
                                    : metrics?.volumeForecast?.history.length ?
                                        <AreaChart data={metrics.volumeForecast.history.map((day) => ({ value: day.value, label: new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }))} tooltipContent={(item) => `${item.value} tickets`} />
                                        : <Text secondary>No ticket history is available yet.</Text>}
                            </Card.Content>
                        </Card>
                    </Cell>
                    <Cell span={5}>
                        <Card>
                            <Card.Header
                                title="Service levels"
                                subtitle="Current SLA performance"
                            />
                            <Card.Content>
                                <Box direction="vertical" gap="SP3">{loading ? <SkeletonRectangle width="100%" height="150px" />
                                    : <>
                                        <Box align="space-between">
                                            <Text>First response met</Text>
                                            <Text weight="bold">{metrics?.sla?.firstResponseMetPct == null ? '—' : `${metrics.sla.firstResponseMetPct}%`}</Text>
                                        </Box>
                                        <Box align="space-between">
                                            <Text>Resolution met</Text>
                                            <Text weight="bold">{metrics?.sla?.resolutionMetPct == null ? '—' : `${metrics.sla.resolutionMetPct}%`}</Text>
                                        </Box>
                                        <Box align="space-between">
                                            <Text>At risk</Text>
                                            <Text weight="bold">{metrics?.sla?.atRisk ?? 0}</Text>
                                        </Box>
                                        <Box align="space-between">
                                            <Text>Open breaches</Text>
                                            <Text weight="bold">{metrics?.sla?.breachedOpen ?? 0}</Text>
                                        </Box>
                                    </>
                                }
                                </Box>
                            </Card.Content>
                        </Card>
                    </Cell>
                </Layout>
                <Layout cols={12} gap="24px">
                    <Cell span={6}>
                        <Card>
                            <Card.Header
                                title="Tickets by agent"
                                subtitle="Assigned ticket volume in the selected period"
                            />
                            <Card.Content>
                                {loading ?
                                    <SkeletonRectangle width="100%" height="120px" />
                                    : metrics?.ticketsPerAgent.length ?
                                        <Box direction="vertical" gap="SP2">{metrics.ticketsPerAgent.map((agent) =>
                                            <Box key={agent.agentId} align="space-between">
                                                <Text>{agent.name}</Text>
                                                <Text weight="bold">{agent.count}</Text>
                                            </Box>
                                        )}
                                        </Box>
                                        : <Text secondary>No agent assignment data is available.</Text>
                                }
                            </Card.Content>
                        </Card>
                    </Cell>
                    <Cell span={6}>
                        <Card>
                            <Card.Header
                                title="Tickets by status and priority"
                                subtitle="Distribution in the selected period"
                            />
                            <Card.Content>
                                {loading ?
                                    <SkeletonRectangle width="100%" height="120px" />
                                    : <Box direction="vertical" gap="SP3">
                                        <Box direction="vertical" gap="SP2">
                                            <Text weight="bold">By status</Text>
                                            {Object.entries(metrics?.statusCounts ?? {}).map(([label, count]) =>
                                                <Box key={label} align="space-between">
                                                    <Text>{label}</Text>
                                                    <Text>{count}</Text>
                                                </Box>
                                            )}
                                        </Box>
                                        <Box direction="vertical" gap="SP2">
                                            <Text weight="bold">By priority</Text>
                                            {Object.entries(metrics?.priorityCounts ?? {}).map(([label, count]) =>
                                                <Box key={label} align="space-between">
                                                    <Text>{label}</Text>
                                                    <Text>{count}</Text>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                }
                            </Card.Content>
                        </Card>
                    </Cell>
                </Layout>
                <Card>
                    <Card.Header
                        title="Team performance"
                        subtitle="Ticket workload and SLA performance by team"
                    />
                    <Card.Content>
                        {loading ?
                            <SkeletonRectangle width="100%" height="100px" />
                            : metrics?.ticketsPerTeam.length ?
                                <Box direction="vertical" gap="SP2">
                                    {metrics.ticketsPerTeam.map((team) =>
                                        <Box key={team.teamId} align="space-between" verticalAlign="middle" padding="SP2">
                                            <Box direction="vertical">
                                                <Text weight="bold">{team.name}</Text>
                                                <Text size="small" secondary>
                                                    {team.openTickets} open · {team.count} total tickets
                                                </Text>
                                            </Box>
                                            <Text>
                                                {team.slaMetPct == null ? 'SLA —' : `${team.slaMetPct}% SLA met`}
                                            </Text>
                                        </Box>
                                    )}
                                </Box>
                                : <Text secondary>No team report data is available yet.</Text>
                        }
                    </Card.Content></Card>
                <Card>
                    <Card.Header
                        title="Build a custom report"
                        subtitle="Choose summary metrics and an optional breakdown, then download or export the selected-period report."
                    />
                    <Card.Content>
                        <Box direction="vertical" gap="SP3">
                            <FormField label="Report name">
                                <Input
                                    value={reportName}
                                    onChange={(event) => setReportName(event.currentTarget.value)}
                                    placeholder="Enter a report name"
                                />
                            </FormField>
                            <FormField label="Break down by">
                                <Dropdown
                                    options={[
                                        { id: 'none', value: 'No breakdown' },
                                        { id: 'team', value: 'Team' },
                                        { id: 'agent', value: 'Agent' },
                                        { id: 'status', value: 'Status' },
                                        { id: 'priority', value: 'Priority' }
                                    ]}
                                    selectedId={breakdown}
                                    onSelect={(option) => setBreakdown(String(option.id) as BreakdownKind)}
                                />
                            </FormField>
                            <Box direction="vertical" gap="SP2">
                                {REPORT_FIELDS.map((field) =>
                                    <Checkbox
                                        key={field.id}
                                        checked={selectedFields.includes(field.id)}
                                        onChange={(event) => setSelectedFields((current) => event.target.checked ? [...current, field.id] : current.filter((id) => id !== field.id))}
                                    >
                                        {field.label}
                                    </Checkbox>
                                )}
                            </Box>
                            {(customRows.length > 0 || breakdownRows.length > 0) && <Card>
                                <Card.Content>
                                    <Box direction="vertical" gap="SP2">
                                        <Heading
                                            size="small"
                                        >
                                            {reportName.trim() || 'Custom report'} · {PERIOD_OPTIONS.find((option) => option.id === periodDays)?.value}
                                        </Heading>
                                        {customRows.map((row) =>
                                            <Box key={row.label} align="space-between">
                                                <Text>{row.label}</Text>
                                                <Text weight="bold">{row.value}</Text>
                                            </Box>
                                        )}
                                        {breakdownRows.map((row) =>
                                            <Box key={`${breakdown}-${row.label}`} align="space-between">
                                                <Text>{row.label}</Text>
                                                <Text weight="bold">{row.count}</Text>
                                            </Box>
                                        )}
                                    </Box>
                                </Card.Content>
                            </Card>}
                            {!customRows.length && !breakdownRows.length &&
                                <Text secondary>Select a summary metric or a breakdown to build your report.</Text>
                            }
                            <Box gap="SP2">
                                <Button
                                    priority="secondary"
                                    disabled={!metrics || (!customRows.length && !breakdownRows.length)}
                                    onClick={() => downloadCustom('report')}>
                                    Download report
                                </Button>
                                <Button
                                    priority="secondary"
                                    disabled={!metrics || (!customRows.length && !breakdownRows.length)}
                                    onClick={() => downloadCustom('csv')}>
                                    Export CSV
                                </Button>
                            </Box>
                        </Box>
                    </Card.Content>
                </Card>
            </Box>
        </Page.Content>
    </Page>
};

export default ReportsDashboard;

import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { getClockState, SLA_PRIORITIES, toPriorityKey, type SlaPriorityKey, CollectionIds } from '@jrapps/my_tickets_common_types';

const CACHE_TTL_MS = 60_000;
const PAGE_SIZE = 1000;
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 3_600_000;
const OPEN_STATUSES = new Set(['open', 'in_progress']);
const DONE_STATUSES = new Set(['resolved', 'closed']);
const RESOLVED_RE = /resolved|closed/i;

const analyticsCache = new Map<string, { expiresAt: number; value: unknown }>();
// Concurrent identical requests share one computation instead of each hitting the DB.
const inflight = new Map<string, Promise<unknown>>();

const TICKET_FIELDS = ['_id', 'status', 'priority', '_createdDate', '_updatedDate', 'teamId', 'isSpam', 'isDeleted', 'assignedAgent', 'assignedTeam', 'communication', 'timeline', 'sla'];

/**
 * Fetches every row of a query. The first page also returns the total count, then the
 * remaining pages are fetched in parallel instead of one cursor hop at a time.
 */
async function fetchAll(build: () => any, fields: string[]): Promise<any[]> {
    const first = await build().fields(...fields).ascending('_id').limit(PAGE_SIZE).find({ returnTotalCount: true });
    const total: number = first.totalCount ?? first.items.length;
    if (first.items.length >= total) return first.items;
    const extraPages = Math.ceil(total / PAGE_SIZE) - 1;
    const rest = await Promise.all(
        Array.from({ length: extraPages }, (_, i) =>
            build().fields(...fields).ascending('_id').skip((i + 1) * PAGE_SIZE).limit(PAGE_SIZE).find({ returnTotalCount: false })
        )
    );
    return [first.items, ...rest.map((r: any) => r.items)].flat();
}

// Earliest agent message at/after createdAt (single pass, no filter+sort).
function firstAgentReplyAt(communication: any[] | undefined, createdAt: number): number | null {
    let best = Infinity;
    for (const message of communication || []) {
        if (message.senderType !== 'agent') continue;
        const ts = Number(message.timestamp);
        if (ts >= createdAt && ts < best) best = ts;
    }
    return best === Infinity ? null : best;
}

// Latest resolved/closed event (single pass, no filter+sort).
function terminalEventAt(timeline: any[] | undefined): number | null {
    let best = -Infinity;
    for (const event of timeline || []) {
        if (event.type === 'ticket_closed' || (event.type === 'ticket_status_changed' && RESOLVED_RE.test(event.message || ''))) {
            const ts = Number(event.timestamp);
            if (ts > best) best = ts;
        }
    }
    return best === -Infinity ? null : best;
}

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

async function buildMetrics(teamId: string, periodDays: number | undefined) {
    const now = Date.now();
    const todayUtc = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate());
    const periodStart = periodDays ? todayUtc - (periodDays - 1) * DAY : 0;

    // Push team + period filtering into the database so we only transfer (and later scan)
    // tickets that can actually be reported on.
    const base = () => {
        let query = items.query(CollectionIds.TICKETS);
        if (periodStart) query = query.ge('_createdDate', new Date(periodStart));
        return query;
    };
    const buildTicketQuery = () => teamId === 'system_admin'
        ? base()
        : base().eq('teamId', teamId).or(base().eq('assignedTeam.id', teamId));

    // Tickets and teams are independent, so fetch them concurrently.
    const [fetchedTickets, teamRecords] = await Promise.all([
        fetchAll(buildTicketQuery, TICKET_FIELDS),
        fetchAll(() => items.query(CollectionIds.TEAMS), ['_id', 'name']),
    ]);

    // Safety net: identical semantics to the original in-memory filtering.
    const reportableTickets = fetchedTickets.filter(ticket => {
        if (teamId !== 'system_admin' && !(ticket.teamId === teamId || ticket.assignedTeam?.id === teamId)) return false;
        if (ticket.isSpam === true || ticket.isDeleted === true) return false;
        if (!periodDays) return true;
        const createdAt = new Date(ticket._createdDate || 0).getTime();
        return Number.isFinite(createdAt) && createdAt >= periodStart && createdAt <= now;
    });

    const thirtyDaysAgo = now - 30 * DAY;
    const historyDays = periodDays ?? 30;
    const historyStartUtc = todayUtc - (historyDays - 1) * DAY;
    const dailyCounts = Array.from({ length: historyDays }, (_, index) => ({
        date: new Date(historyStartUtc + index * DAY).toISOString().slice(0, 10),
        value: 0,
    }));

    // Seed per-team map (same insertion order as before: team records order, then discovered teams).
    const reportTeamIds = new Set<string>();
    for (const ticket of reportableTickets) {
        const assignedTeamId = typeof ticket.assignedTeam === 'string' ? ticket.assignedTeam : ticket.assignedTeam?.id;
        if (typeof ticket.teamId === 'string' && ticket.teamId) reportTeamIds.add(ticket.teamId);
        if (typeof assignedTeamId === 'string' && assignedTeamId) reportTeamIds.add(assignedTeamId);
    }
    type TeamAcc = {
        teamId: string; name: string; count: number; openTickets: number;
        firstResponseHours: number[]; resolutionHours: number[]; slaMet: number; slaMeasured: number;
    };
    const perTeam = new Map<string, TeamAcc>();
    for (const team of teamRecords) {
        if (!team._id || !reportTeamIds.has(team._id)) continue;
        perTeam.set(team._id, {
            teamId: team._id, name: team.name || 'Team', count: 0, openTickets: 0,
            firstResponseHours: [], resolutionHours: [], slaMet: 0, slaMeasured: 0,
        });
    }
    const perAgent = new Map<string, { agentId: string; name: string; count: number }>();

    const emptyCompliance = () => ({ measured: 0, met: 0 });
    const firstResponseCompliance = emptyCompliance();
    const resolutionCompliance = emptyCompliance();
    let slaTracked = 0, slaAtRisk = 0, slaBreachedOpen = 0, slaBreachesLast30Days = 0, slaEscalated = 0;
    const slaByPriority = Object.fromEntries(SLA_PRIORITIES.map((key) => [key, { tracked: 0, breached: 0 }])) as Record<SlaPriorityKey, { tracked: number; breached: number }>;

    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    const firstResponseDurations: number[] = [];
    const resolutionDurations: number[] = [];
    let recentCount = 0;
    let activeCount = 0;
    let completedCount = 0;

    // Single pass over tickets: everything that used to need ~8 separate scans.
    for (const ticket of reportableTickets) {
        const createdAt = new Date(ticket._createdDate || 0).getTime();
        const createdFinite = Number.isFinite(createdAt);
        const isOpen = OPEN_STATUSES.has(ticket.status);
        const isDone = DONE_STATUSES.has(ticket.status);

        if (createdFinite) {
            if (createdAt >= thirtyDaysAgo) recentCount++;
            const dayIndex = Math.floor((createdAt - historyStartUtc) / DAY);
            if (dayIndex >= 0 && dayIndex < dailyCounts.length) dailyCounts[dayIndex].value++;
        }
        if (isOpen) activeCount++;
        if (isDone) completedCount++;
        const statusKey = typeof ticket.status === 'string' ? ticket.status : 'unknown';
        statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
        const priorityKey = typeof ticket.priority === 'string' ? ticket.priority : 'unknown';
        priorityCounts[priorityKey] = (priorityCounts[priorityKey] || 0) + 1;

        // Response / resolution durations: computed once, used for both global and team stats.
        let firstResponseHours: number | null = null;
        let resolutionHours: number | null = null;
        if (createdFinite && createdAt > 0) {
            const replyAt = firstAgentReplyAt(ticket.communication, createdAt);
            if (replyAt !== null) firstResponseHours = (replyAt - createdAt) / HOUR;
            if (isDone) {
                const terminalAt = terminalEventAt(ticket.timeline);
                if (terminalAt !== null && terminalAt >= createdAt) resolutionHours = (terminalAt - createdAt) / HOUR;
            }
            if (firstResponseHours !== null) firstResponseDurations.push(firstResponseHours);
            if (resolutionHours !== null) resolutionDurations.push(resolutionHours);
        }

        // SLA clock states: computed once per clock.
        const sla = ticket.sla;
        const firstState = sla?.firstResponse ? getClockState(sla.firstResponse, now) : null;
        const nextState = sla?.nextResponse ? getClockState(sla.nextResponse, now) : null;
        const resolutionState = sla?.resolution ? getClockState(sla.resolution, now) : null;

        // Global SLA
        if (sla) {
            slaTracked++;
            const slaKey = toPriorityKey(ticket.priority);
            slaByPriority[slaKey].tracked++;
            const tally = (state: string | null, dueAt: number | undefined, compliance: { measured: number; met: number }) => {
                if (state === 'met') { compliance.measured++; compliance.met++; }
                if (state === 'met_late' || state === 'breached') compliance.measured++;
                if ((state === 'met_late' || state === 'breached') && (dueAt as number) >= thirtyDaysAgo) slaBreachesLast30Days++;
            };
            tally(firstState, sla.firstResponse?.dueAt, firstResponseCompliance);
            tally(resolutionState, sla.resolution?.dueAt, resolutionCompliance);
            const states = [firstState, resolutionState];
            if (states.includes('breached') || states.includes('met_late')) slaByPriority[slaKey].breached++;
            if (states.includes('breached')) slaBreachedOpen++;
            else if (states.includes('at_risk')) slaAtRisk++;
            if (sla.escalatedAt) slaEscalated++;
        }

        // Per agent
        const agent = ticket.assignedAgent;
        if (agent?.id) {
            const current = perAgent.get(agent.id) || { agentId: agent.id, name: agent.name || 'Agent', count: 0 };
            current.count++;
            perAgent.set(agent.id, current);
        }

        // Per team
        const assignedTeam = ticket.assignedTeam;
        const ticketTeamId = typeof assignedTeam === 'string' ? assignedTeam : assignedTeam?.id || ticket.teamId;
        if (!ticketTeamId) continue;
        let current = perTeam.get(ticketTeamId);
        if (!current) {
            current = {
                teamId: ticketTeamId,
                name: typeof assignedTeam === 'object' ? assignedTeam?.name || 'Team' : 'Team',
                count: 0, openTickets: 0, firstResponseHours: [], resolutionHours: [], slaMet: 0, slaMeasured: 0,
            };
            perTeam.set(ticketTeamId, current);
        }
        if (typeof assignedTeam === 'object' && assignedTeam?.name) current.name = assignedTeam.name;
        current.count++;
        if (isOpen) current.openTickets++;
        if (firstResponseHours !== null) current.firstResponseHours.push(firstResponseHours);
        if (resolutionHours !== null) current.resolutionHours.push(resolutionHours);
        for (const state of [firstState, nextState, resolutionState]) {
            if (state === 'met') { current.slaMet++; current.slaMeasured++; }
            else if (state === 'met_late' || state === 'breached') current.slaMeasured++;
        }
    }

    // Trend / forecast
    const meanX = (dailyCounts.length - 1) / 2;
    const meanY = dailyCounts.reduce((sum, item) => sum + item.value, 0) / dailyCounts.length;
    let varianceX = 0;
    let covariance = 0;
    for (let i = 0; i < dailyCounts.length; i++) {
        varianceX += (i - meanX) ** 2;
        covariance += (i - meanX) * (dailyCounts[i].value - meanY);
    }
    const trendSlope = varianceX ? covariance / varianceX : 0;
    const forecastDaily = Array.from({ length: 7 }, (_, index) => ({
        date: new Date(todayUtc + (index + 1) * DAY).toISOString().slice(0, 10),
        value: Math.max(0, Math.round(meanY + trendSlope * (dailyCounts.length + index - meanX))),
    }));

    const toPct = ({ measured, met }: { measured: number; met: number }) => measured ? Math.round((met / measured) * 1000) / 10 : null;

    return {
        periodDays: periodDays ?? null,
        totalTickets: reportableTickets.length,
        ticketVolumeLast30Days: recentCount,
        newTicketsLast30Days: recentCount,
        openTickets: activeCount,
        closedTickets: completedCount,
        statusCounts,
        priorityCounts,
        averageFirstResponseHours: average(firstResponseDurations),
        averageResolutionHours: average(resolutionDurations),
        responseSamples: firstResponseDurations.length,
        resolutionSamples: resolutionDurations.length,
        sla: {
            tracked: slaTracked,
            firstResponseMetPct: toPct(firstResponseCompliance),
            firstResponseMeasured: firstResponseCompliance.measured,
            resolutionMetPct: toPct(resolutionCompliance),
            resolutionMeasured: resolutionCompliance.measured,
            atRisk: slaAtRisk,
            breachedOpen: slaBreachedOpen,
            breachesLast30Days: slaBreachesLast30Days,
            escalated: slaEscalated,
            byPriority: SLA_PRIORITIES.map((key) => ({ priority: key, ...slaByPriority[key] })),
        },
        volumeForecast: {
            history: dailyCounts,
            forecast: forecastDaily,
            averageDailyVolume: Math.round(meanY * 10) / 10,
            projectedNext7Days: forecastDaily.reduce((sum, day) => sum + day.value, 0),
            trendDirection: trendSlope > 0.15 ? 'increasing' : trendSlope < -0.15 ? 'decreasing' : 'steady',
            method: '30-day linear trend',
        },
        ticketsPerAgent: Array.from(perAgent.values()).sort((a, b) => b.count - a.count),
        ticketsPerTeam: Array.from(perTeam.values())
            .map(({ firstResponseHours, resolutionHours, slaMet, slaMeasured, ...team }) => ({
                ...team,
                averageFirstResponseHours: average(firstResponseHours),
                averageResolutionHours: average(resolutionHours),
                slaMetPct: slaMeasured ? Math.round((slaMet / slaMeasured) * 1000) / 10 : null,
                slaMeasured,
            }))
            .sort((a, b) => b.count - a.count),
    };
}

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        const url = new URL(request.url);
        const teamId = url.searchParams.get('teamId');
        const periodDaysValue = url.searchParams.get('periodDays');
        const periodDays = periodDaysValue ? Number(periodDaysValue) : undefined;
        if (periodDays !== undefined && ![7, 30, 90, 365].includes(periodDays)) {
            status = 400;
            throw new Error('Unsupported report timeframe');
        }
        if (!teamId) {
            status = 400;
            throw new Error('Team ID is required');
        }
        const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

        const cacheKey = `${teamId}:${periodDays ?? 'all'}`;
        const cached = analyticsCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return json({ success: true, metrics: cached.value, fromCache: true });
        }

        let pending = inflight.get(cacheKey);
        if (!pending) {
            pending = buildMetrics(teamId, periodDays)
                .then((metrics) => {
                    const t = Date.now();
                    for (const [key, entry] of analyticsCache) if (entry.expiresAt <= t) analyticsCache.delete(key);
                    analyticsCache.set(cacheKey, { expiresAt: t + CACHE_TTL_MS, value: metrics });
                    return metrics;
                })
                .finally(() => inflight.delete(cacheKey));
            inflight.set(cacheKey, pending);
        }
        return json({ success: true, metrics: await pending });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to load ticket analytics' }), {
            status,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};
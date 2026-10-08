import { useEffect, useState, type FC } from 'react';
import { Badge, Box, Text, Tooltip } from '@wix/design-system';
import type { SlaClock, SlaClockState, TicketSla } from '@jrapps/my_tickets_common_types';
import { formatSlaDuration, getClockState, getSlaSummary } from '@jrapps/my_tickets_common_types';

const SKINS: Record<SlaClockState, 'danger' | 'warning' | 'neutralLight' | 'success' | 'neutral'> = {
    breached: 'danger',
    at_risk: 'warning',
    on_track: 'neutralLight',
    met: 'success',
    met_late: 'neutral',
};

const STATE_TEXT: Record<SlaClockState, string> = {
    breached: 'Breached',
    at_risk: 'At risk',
    on_track: 'On track',
    met: 'Met',
    met_late: 'Met late',
};

const useMinuteTick = (active: boolean) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!active) return;
        setNow(Date.now());
        const interval = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(interval);
    }, [active]);
    return now;
};

const clockLine = (title: string, clock: SlaClock | undefined, now: number) => {
    if (!clock) return null;
    const state = getClockState(clock, now);
    const due = new Date(clock.dueAt).toLocaleString();
    return (
        <Box key={title} direction="vertical">
            <Text size="tiny" light weight="bold">{title}: {STATE_TEXT[state]}</Text>
            <Text size="tiny" light>
                {clock.doneAt ? `Done ${new Date(clock.doneAt).toLocaleString()} (due ${due})` : `Due ${due}`}
            </Text>
        </Box>
    );
};

interface SlaBadgeProps {
    sla?: TicketSla;
    /** Short label for dense lists. */
    compact?: boolean;
}

const SlaBadge: FC<SlaBadgeProps> = ({ sla, compact = false }) => {
    const hasOpenClock = Boolean(sla && [sla.firstResponse, sla.nextResponse, sla.resolution].some((clock) => clock && !clock.doneAt));
    const now = useMinuteTick(hasOpenClock);
    const summary = getSlaSummary(sla, now);
    if (!sla || !summary) return null;

    const remaining = summary.dueAt - now;
    const compactText = summary.state === 'breached' ? `Overdue ${formatSlaDuration(remaining)}`
        : summary.state === 'met' || summary.state === 'met_late' ? `SLA ${STATE_TEXT[summary.state].toLowerCase()}`
            : formatSlaDuration(remaining);

    return (
        <Tooltip
            appendTo="window"
            size="small"
            content={
                <Box direction="vertical" gap={1}>
                    {clockLine('First response', sla.firstResponse, now)}
                    {clockLine('Next response', sla.nextResponse, now)}
                    {clockLine('Resolution', sla.resolution, now)}
                    {sla.escalatedAt && <Text size="tiny" light>Priority raised {new Date(sla.escalatedAt).toLocaleString()}</Text>}
                </Box>
            }
        >
            <span>
                <Badge size="small" skin={SKINS[summary.state]} type="outlined">
                    {compact ? compactText : summary.label}
                </Badge>
            </span>
        </Tooltip>
    );
};

export default SlaBadge;

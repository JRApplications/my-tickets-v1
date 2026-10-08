import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { randomUUID } from 'node:crypto';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import {
    TimelineMessageType, 
    type SlaClock, 
    type SlaSettings, 
    type TicketSla,
    buildSlaClock, 
    buildTicketSla, 
    getNextCheckAt, 
    normalizeSlaSettings, 
    resolveSlaTargets, 
    SLA_PRIORITIES,
    formatPriority
} from '@jrapps/my_tickets_common_types';
import { notifyAgent } from './notifyAgent';

const SETTINGS_CACHE_TTL_MS = 30_000;
const ACTIVE_STATUSES = ['open', 'in_progress'];
const BACKFILL_BATCH = 50;
const DUE_BATCH = 100;

let settingsCache: { value: SlaSettings; expiresAt: number } | null = null;

export const invalidateSlaSettingsCache = () => {
    settingsCache = null;
};

export const getSlaSettings = async (): Promise<SlaSettings> => {
    if (settingsCache && settingsCache.expiresAt > Date.now()) return settingsCache.value;
    const result = await auth.elevate(items.query)(CollectionIds.SLA_SETTINGS).limit(1).find();
    const value = normalizeSlaSettings(result.items[0]);
    settingsCache = { value, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
    return value;
};

export const saveSlaSettings = async (settings: SlaSettings): Promise<SlaSettings> => {
    const existing = await auth.elevate(items.query)(CollectionIds.SLA_SETTINGS).limit(1).find();
    const { _id: _ignored, ...data } = settings;
    const saved = existing.items[0]
        ? await auth.elevate(items.update)(CollectionIds.SLA_SETTINGS, { ...data, _id: existing.items[0]._id })
        : await auth.elevate(items.insert)(CollectionIds.SLA_SETTINGS, data);
    invalidateSlaSettingsCache();
    return normalizeSlaSettings(saved);
};

const toMs = (value: any): number => {
    const ms = value instanceof Date ? value.getTime() : new Date(value?.$date ?? value).getTime();
    return Number.isFinite(ms) ? ms : Date.now();
};

const getTeamId = (ticket: any): string | undefined =>
    typeof ticket?.assignedTeam === 'string' ? ticket.assignedTeam : ticket?.assignedTeam?.id;

const isActiveTicket = (ticket: any): boolean =>
    ACTIVE_STATUSES.includes(ticket?.status) && ticket?.isSpam !== true && ticket?.isDeleted !== true;

const saveSla = async (ticketId: string, sla: TicketSla, extra?: { priority?: string }) => {
    const patch = auth.elevate(items.bulkPatch)(CollectionIds.TICKETS, [ticketId])
        .setField('sla', sla)
        .setField('slaNextCheckAt', getNextCheckAt(sla));
    if (extra?.priority) patch.setField('priority', extra.priority);
    const result = await patch.run();
    if (result?.errors?.length) throw new Error(`Failed to save SLA. Code ${result.errors[0].code}`);
};

const appendTimeline = async (ticketId: string, type: TimelineMessageType, message: string) => {
    await auth.elevate(items.bulkPatch)(CollectionIds.TICKETS, [ticketId])
        .appendToArray('timeline', { _id: randomUUID(), ticketId, timestamp: Date.now(), type, message })
        .run();
};

const buildForTicket = (ticket: any, settings: SlaSettings, existing?: TicketSla, now = Date.now()): TicketSla =>
    buildTicketSla({ createdAtMs: toMs(ticket._createdDate), priority: ticket.priority, teamId: getTeamId(ticket) }, settings, existing, now);

/** Tickets that existed before SLA tracking get no retroactive alerts for deadlines already passed. */
const buildFromHistory = (ticket: any, settings: SlaSettings, now: number): TicketSla => {
    if (!isActiveTicket(ticket)) return { updatedAt: now };
    const sla = buildForTicket(ticket, settings, undefined, now);
    const messages = (ticket.communication || [])
        .map((message: any) => ({ ...message, timestamp: Number(message.timestamp) }))
        .filter((message: any) => Number.isFinite(message.timestamp))
        .sort((a: any, b: any) => a.timestamp - b.timestamp);
    const firstAgentReply = messages.find((message: any) => message.senderType === 'agent')?.timestamp;
    if (sla.firstResponse && firstAgentReply) sla.firstResponse.doneAt = firstAgentReply;
    let lastAgentReplyAt: number | undefined;
    let nextResponseStartedAt: number | undefined;
    let nextResponseDoneAt: number | undefined;
    for (const message of messages) {
        if (message.senderType === 'agent') {
            lastAgentReplyAt = message.timestamp;
            if (nextResponseStartedAt !== undefined && message.timestamp >= nextResponseStartedAt) nextResponseDoneAt = message.timestamp;
        } else if ((message.senderType === 'user' || message.senderType === 'visitor') && lastAgentReplyAt !== undefined && message.timestamp >= lastAgentReplyAt) {
            nextResponseStartedAt = message.timestamp;
            nextResponseDoneAt = undefined;
        }
    }
    if (nextResponseStartedAt !== undefined) {
        const targets = resolveSlaTargets(settings, getTeamId(ticket), ticket.priority);
        const nextResponse = buildSlaClock(nextResponseStartedAt, targets.nextResponseMinutes, settings);
        if (nextResponse) {
            if (nextResponseDoneAt !== undefined) nextResponse.doneAt = nextResponseDoneAt;
            sla.nextResponse = nextResponse;
        }
    }
    for (const clock of [sla.firstResponse, sla.nextResponse, sla.resolution]) {
        if (!clock || clock.doneAt) continue;
        if (now >= clock.atRiskAt) clock.atRiskNotifiedAt = now;
        if (now > clock.dueAt) clock.breachedNotifiedAt = now;
    }
    return sla;
};

export const initTicketSla = async (ticket: any) => {
    const settings = await getSlaSettings();
    if (!settings.enabled || !ticket?._id) return;
    await saveSla(ticket._id, buildForTicket(ticket, settings));
};

const getTicket = async (ticketId: string) =>
    auth.elevate(items.get)(CollectionIds.TICKETS, ticketId, { consistentRead: true });

/** Re-applies the current policy (priority or team change) to clocks that are still running. */
export const recomputeTicketSla = async (ticketId: string) => {
    const settings = await getSlaSettings();
    if (!settings.enabled) return;
    const ticket: any = await getTicket(ticketId);
    if (!ticket) return;
    const sla = ticket.sla ? buildForTicket(ticket, settings, ticket.sla) : buildFromHistory(ticket, settings, Date.now());
    await saveSla(ticketId, sla);
};

const mutateSla = async (ticketId: string, mutate: (sla: TicketSla, now: number, ticket: any, settings: SlaSettings) => void) => {
    const settings = await getSlaSettings();
    if (!settings.enabled) return;
    const ticket: any = await getTicket(ticketId);
    if (!ticket) return;
    const now = Date.now();
    const sla: TicketSla = ticket.sla ?? buildFromHistory(ticket, settings, now);
    mutate(sla, now, ticket, settings);
    sla.updatedAt = now;
    await saveSla(ticketId, sla);
};

export const markSlaFirstResponse = (ticketId: string, at = Date.now()) =>
    mutateSla(ticketId, (sla) => {
        if (sla.firstResponse && !sla.firstResponse.doneAt) sla.firstResponse.doneAt = at;
        if (sla.nextResponse && !sla.nextResponse.doneAt) sla.nextResponse.doneAt = at;
    });

export const markSlaNextResponse = (ticketId: string, at = Date.now()) =>
    mutateSla(ticketId, (sla, _now, ticket, settings) => {
        if (!isActiveTicket(ticket)) return;
        const hasPriorAgentReply = (ticket.communication || []).some((message: any) =>
            message.senderType === 'agent' && Number(message.timestamp) <= at
        );
        if (!hasPriorAgentReply) return;
        const targets = resolveSlaTargets(settings, getTeamId(ticket), ticket.priority);
        const clock = buildSlaClock(at, targets.nextResponseMinutes, settings);
        if (clock) sla.nextResponse = clock;
        else delete sla.nextResponse;
    });

export const markSlaResolved = (ticketId: string, at = Date.now()) =>
    mutateSla(ticketId, (sla) => {
        for (const clock of [sla.firstResponse, sla.nextResponse, sla.resolution]) {
            if (clock && !clock.doneAt) clock.doneAt = at;
        }
    });

export const markSlaReopened = (ticketId: string) =>
    mutateSla(ticketId, (sla) => {
        if (sla.resolution?.doneAt) delete sla.resolution.doneAt;
    });

/** SLA bookkeeping must never fail the ticket action that triggered it. */
export const runSlaHook = async (hook: () => Promise<unknown>) => {
    try {
        await hook();
    } catch (error) {
        console.error('SLA hook failed:', error);
    }
};

const getRecipients = async (ticket: any): Promise<string[]> => {
    if (ticket.assignedAgent?.id) return [ticket.assignedAgent.id];
    const teamId = getTeamId(ticket);
    if (!teamId) return [];
    const result = await auth.elevate(items.query)(CollectionIds.AGENTS).eq('team', teamId).fields('_id').limit(100).find();
    return result.items.map((agent: any) => agent._id);
};

const notifyRecipients = async (ticket: any, subtitle: string) => {
    try {
        const notification = { id: randomUUID(), title: `SLA Alert: #${ticket.primaryTicketNumber}`, subtitle };
        const recipients = await getRecipients(ticket);
        await Promise.all(recipients.map((agentId) => notifyAgent(agentId, notification).catch((e) => console.error('SLA notification failed:', e))));
    } catch (error) {
        console.error('SLA notification failed:', error);
    }
};

const CLOCKS: Array<['firstResponse' | 'nextResponse' | 'resolution', string]> = [
    ['firstResponse', 'First response'],
    ['nextResponse', 'Next response'],
    ['resolution', 'Resolution'],
];

const nextPriority = (priority: string): string | null => {
    const order = [...SLA_PRIORITIES].reverse();
    const index = order.indexOf(priority as (typeof order)[number]);
    return index >= 0 && index < order.length - 1 ? order[index + 1] : null;
};

const evaluateTicket = async (ticket: any, settings: SlaSettings, now: number) => {
    if (!isActiveTicket(ticket)) {
        await auth.elevate(items.bulkPatch)(CollectionIds.TICKETS, [ticket._id]).setField('slaNextCheckAt', null).run();
        return;
    }
    if (!ticket.sla) {
        await saveSla(ticket._id, buildFromHistory(ticket, settings, now));
        return;
    }

    let sla: TicketSla = ticket.sla;
    const events: Array<{ type: TimelineMessageType; text: string }> = [];
    let breached = false;
    for (const [name, label] of CLOCKS) {
        const clock: SlaClock | undefined = sla[name];
        if (!clock || clock.doneAt || clock.breachedNotifiedAt) continue;
        if (now > clock.dueAt) {
            clock.breachedNotifiedAt = now;
            clock.atRiskNotifiedAt ??= now;
            breached = true;
            events.push({ type: TimelineMessageType.SLA_BREACHED, text: `${label} SLA breached` });
        } else if (now >= clock.atRiskAt && !clock.atRiskNotifiedAt) {
            clock.atRiskNotifiedAt = now;
            events.push({ type: TimelineMessageType.SLA_AT_RISK, text: `${label} SLA is at risk` });
        }
    }

    let newPriority: string | null = null;
    let appliedRuleId: string | null = null;
    if (breached) {
        const applied = new Set<string>(ticket.escalationRulesApplied || []);
        const teamId = getTeamId(ticket);
        const matchingRule = settings.escalationRules.find((rule) =>
            rule.enabled && !applied.has(rule.id) &&
            (!rule.priority || rule.priority === ticket.priority) &&
            (!rule.teamId || rule.teamId === teamId) &&
            (!rule.tag || (ticket.tags || []).includes(rule.tag))
        );
        if (matchingRule && SLA_PRIORITIES.indexOf(matchingRule.setPriority) < SLA_PRIORITIES.indexOf(ticket.priority)) {
            newPriority = matchingRule.setPriority;
            appliedRuleId = matchingRule.id;
        } else if (!matchingRule && settings.escalateOnBreach && !sla.escalatedAt) {
            newPriority = nextPriority(String(ticket.priority));
        }
        if (newPriority) {
            sla.escalatedAt = now;
            sla = buildForTicket({ ...ticket, priority: newPriority }, settings, sla, now);
            const ruleName = matchingRule?.name;
            events.push({
                type: TimelineMessageType.SLA_ESCALATED, text: ruleName
                    ? `Escalation rule “${ruleName}” raised priority to ${formatPriority(newPriority as any)}`
                    : `Priority raised to ${formatPriority(newPriority as any)} after SLA breach`
            });
        }
    }
    sla.updatedAt = now;

    await saveSla(ticket._id, sla, newPriority ? { priority: newPriority } : undefined);
    if (appliedRuleId) {
        await auth.elevate(items.bulkPatch)(CollectionIds.TICKETS, [ticket._id])
            .appendToArray('escalationRulesApplied', appliedRuleId).run();
    }
    for (const event of events) {
        await appendTimeline(ticket._id, event.type, event.text);
        await notifyRecipients(ticket, event.text);
    }
};

export interface SlaSweepResult {
    enabled: boolean;
    backfilled: number;
    evaluated: number;
}

export const runSlaSweep = async (now = Date.now()): Promise<SlaSweepResult> => {
    const settings = await getSlaSettings();
    if (!settings.enabled) return { enabled: false, backfilled: 0, evaluated: 0 };

    const missing = await auth.elevate(items.query)(CollectionIds.TICKETS).isEmpty('sla').limit(BACKFILL_BATCH).find();
    for (const ticket of missing.items as any[]) {
        await saveSla(ticket._id, buildFromHistory(ticket, settings, now)).catch((e) => console.error('SLA backfill failed:', e));
    }

    const due = await auth.elevate(items.query)(CollectionIds.TICKETS).le('slaNextCheckAt', now).limit(DUE_BATCH).find();
    for (const ticket of due.items as any[]) {
        await evaluateTicket(ticket, settings, now).catch((e) => console.error('SLA evaluation failed:', e));
    }
    return { enabled: true, backfilled: missing.items.length, evaluated: due.items.length };
};

/** Earliest moment an agent should expect a first reply, or null when it should not be shown to customers. */
export const getCustomerExpectedResponseBy = async (ticket: any): Promise<number | null> => {
    const settings = await getSlaSettings();
    if (!settings.enabled || !settings.showCustomerEta) return null;
    const clock = ticket?.sla?.firstResponse;
    if (!clock || clock.doneAt || clock.breachedNotifiedAt || Date.now() > clock.dueAt) return null;
    return clock.dueAt;
};

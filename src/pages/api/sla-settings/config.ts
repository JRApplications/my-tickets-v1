import type { APIRoute } from 'astro';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { saveSlaSettings } from '../utils/slaServer';
import {
    normalizeSlaSettings,
    SLA_PRIORITIES,
    isValidTimezone
} from '@jrapps/my_tickets_common_types';

const validate = (raw: any): string | null => {
    if (!raw || typeof raw !== 'object') return 'Invalid settings';
    if (typeof raw.enabled !== 'boolean' || typeof raw.alwaysOn !== 'boolean') return 'Invalid settings';
    if (typeof raw.timezone !== 'string' || !isValidTimezone(raw.timezone)) return 'Choose a valid timezone';
    if (!Array.isArray(raw.businessHours)) return 'Invalid business hours';
    for (const day of raw.businessHours) {
        if (!Number.isInteger(day?.day) || day.day < 0 || day.day > 6) return 'Invalid business hours';
        if (!day.closed && !(Number(day.endMinute) > Number(day.startMinute))) return 'Business hours must end after they start';
    }
    for (const key of SLA_PRIORITIES) {
        const targets = raw.policies?.[key];
        if (!targets || !Number.isFinite(Number(targets.firstResponseMinutes)) || (targets.nextResponseMinutes != null && !Number.isFinite(Number(targets.nextResponseMinutes))) || !Number.isFinite(Number(targets.resolutionMinutes))) return 'Every priority needs targets';
        if (Number(targets.firstResponseMinutes) < 0 || (targets.nextResponseMinutes != null && Number(targets.nextResponseMinutes) < 0) || Number(targets.resolutionMinutes) < 0) return 'Targets cannot be negative';
    }
    const threshold = Number(raw.atRiskThresholdPct);
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > 99) return 'At risk threshold must be between 1 and 99';
    if (raw.teamOverrides !== undefined && !Array.isArray(raw.teamOverrides)) return 'Invalid team overrides';
    if (raw.escalationRules !== undefined && !Array.isArray(raw.escalationRules)) return 'Invalid escalation rules';
    for (const rule of raw.escalationRules || []) {
        if (!rule || typeof rule.id !== 'string' || typeof rule.name !== 'string' || !rule.name.trim() ||
            typeof rule.enabled !== 'boolean' || !SLA_PRIORITIES.includes(rule.setPriority)) return 'Each escalation rule needs a name and target priority';
        if (rule.priority != null && !SLA_PRIORITIES.includes(rule.priority)) return 'Invalid escalation rule priority';
        if (rule.teamId != null && typeof rule.teamId !== 'string') return 'Invalid escalation rule team';
        if (rule.tag != null && typeof rule.tag !== 'string') return 'Invalid escalation rule tag';
    }
    return null;
};

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        if (!(await checkPermission(request.headers.get('Authorization'), ['ADMIN', 'USER']))) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        let body: any;
        try {
            body = await request.json();
        } catch {
            status = 400;
            throw new Error('Request body is not valid JSON');
        }
        const problem = validate(body);
        if (problem) {
            status = 400;
            throw new Error(problem);
        }
        const settings = await saveSlaSettings(normalizeSlaSettings(body));
        return new Response(JSON.stringify({ success: true, settings }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        const message = status === 400 && error instanceof Error ? error.message : 'Failed to save SLA settings';
        return new Response(JSON.stringify({ success: false, error: message }), {
            status,
            headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
        });
    }
};

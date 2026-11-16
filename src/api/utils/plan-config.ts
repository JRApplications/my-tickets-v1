// Single place that decides which plan tier a site is on and what each tier may do.
// Change the numbers here to change the limits. Paid tiers are matched by package name
// (the names must match the plans in the Wix Dev Center pricing page).

export type PlanLimitedResource = 'tickets' | 'agents' | 'teams' | 'chatConversations';
export type PlanTier = 'free' | 'essential' | 'team' | 'advanced' | 'unknown';
export type PlanLimits = Record<PlanLimitedResource, number | null>;

// Master switch. When false the app behaves as before: a site without a paid plan is asked to start a trial.
export const FREE_PLAN_ENABLED = true;

// Free plan: agents and teams are totals, tickets and chat conversations are per calendar month (UTC).
export const FREE_PLAN_LIMITS: PlanLimits = { agents: 1, teams: 1, tickets: 1, chatConversations: 1 };

export const PAID_PLAN_LIMITS: Record<'essential' | 'team' | 'advanced', PlanLimits> = {
    essential: { agents: 1, teams: 1, chatConversations: 100, tickets: 50 },
    team: { agents: 5, teams: 5, chatConversations: 250, tickets: 150 },
    advanced: { agents: null, teams: null, chatConversations: null, tickets: null },
};

// Paid package names are always checked first, so a paid site can never fall into the free tier.
export function resolvePlanTier(packageName: string | null | undefined, isFree: boolean | null | undefined): PlanTier {
    const name = (packageName ?? '').trim().toLowerCase();
    if (name.includes('essential')) return 'essential';
    if (name.includes('team')) return 'team';
    if (name.includes('advanced')) return 'advanced';
    if (FREE_PLAN_ENABLED && isFree === true) return 'free';
    return 'unknown';
}

// null = unlimited, undefined = not enforced (unrecognised paid package, same as before).
export function getPlanLimit(tier: PlanTier, resource: PlanLimitedResource): number | null | undefined {
    if (tier === 'free') return FREE_PLAN_LIMITS[resource];
    if (tier === 'essential' || tier === 'team' || tier === 'advanced') return PAID_PLAN_LIMITS[tier][resource];
    return undefined;
}

export function getPlanLimits(tier: PlanTier): PlanLimits | undefined {
    if (tier === 'free') return FREE_PLAN_LIMITS;
    if (tier === 'essential' || tier === 'team' || tier === 'advanced') return PAID_PLAN_LIMITS[tier];
    return undefined;
}

// Start (inclusive) and end (exclusive) of the calendar month in UTC that contains `now`.
export function getCalendarMonth(now: Date): { start: Date; end: Date } {
    return {
        start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
    };
}

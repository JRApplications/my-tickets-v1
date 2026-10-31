import { appInstances } from '@wix/app-management';
import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { isSystemAdmin } from '../auth/system-admin';
import { getCalendarMonth, getPlanLimit, resolvePlanTier, type PlanLimitedResource } from './plan-config';

export type { PlanLimitedResource } from './plan-config';

const getCurrentBillingPeriodStart = (planStartedAt: string | undefined, now: Date): Date | null => {
    if (!planStartedAt) return null;
    const planStart = new Date(planStartedAt);
    if (!Number.isFinite(planStart.getTime()) || planStart > now) return null;

    let monthOffset = (now.getUTCFullYear() - planStart.getUTCFullYear()) * 12
        + now.getUTCMonth() - planStart.getUTCMonth();
    const anniversary = (offset: number) => {
        const absoluteMonth = planStart.getUTCFullYear() * 12 + planStart.getUTCMonth() + offset;
        const year = Math.floor(absoluteMonth / 12);
        const month = absoluteMonth - year * 12;
        const day = Math.min(planStart.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
        return new Date(Date.UTC(year, month, day, planStart.getUTCHours(), planStart.getUTCMinutes(), planStart.getUTCSeconds(), planStart.getUTCMilliseconds()));
    };
    if (anniversary(monthOffset) > now) monthOffset -= 1;
    return monthOffset < 0 ? null : anniversary(monthOffset);
};

const COLLECTIONS: Record<PlanLimitedResource, string> = {
    tickets: CollectionIds.TICKETS,
    agents: CollectionIds.AGENTS,
    teams: CollectionIds.TEAMS,
    chatConversations: CollectionIds.CHAT_CONVERSATIONS,
};

export async function getPlanLimitStatus(resource: PlanLimitedResource, agentId?: string): Promise<{
    limit: number | null | undefined;
    count: number | null;
    reached: boolean;
    isFreePlan: boolean;
}> {
    if (isSystemAdmin(agentId)) return { limit: null, count: null, reached: false, isFreePlan: false };

    const getAppInstance = auth.elevate(appInstances.getAppInstance);
    const { instance } = await getAppInstance();
    const tier = resolvePlanTier(instance?.billing?.packageName, instance?.isFree);
    const isFreePlan = tier === 'free';
    // Chat conversations are only enforced on the free plan, so paid sites behave exactly as before.
    const limit = resource === 'chatConversations' && !isFreePlan ? undefined : getPlanLimit(tier, resource);
    if (limit === undefined || limit === null) return { limit, count: null, reached: false, isFreePlan };

    const queryItems = auth.elevate(items.query);
    let query = queryItems(COLLECTIONS[resource]);
    if (resource === 'tickets' || resource === 'chatConversations') {
        const now = new Date();
        const periodStart = isFreePlan
            ? getCalendarMonth(now).start
            : getCurrentBillingPeriodStart(instance?.billing?.timeStamp, now);
        if (!periodStart) throw new Error('The current billing period could not be determined');
        query = query.ge('_createdDate', periodStart);
    }

    const count = await query.count({ consistentRead: true });
    return { limit, count, reached: count >= limit, isFreePlan };
}

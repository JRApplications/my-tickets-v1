import { appInstances } from '@wix/app-management';
import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { isSystemAdmin } from '../auth/system-admin';

export type PlanLimitedResource = 'tickets' | 'agents' | 'teams';

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

const getLimit = (packageName: string, resource: PlanLimitedResource): number | null | undefined => {
    const plan = packageName.toLowerCase();
    if (plan.includes('essential')) return resource === 'agents' || resource === 'teams' ? 1 : 50;
    if (plan.includes('team')) return resource === 'agents' || resource === 'teams' ? 5 : 150;
    if (plan.includes('advanced')) return null;
    return undefined;
};

export async function getPlanLimitStatus(resource: PlanLimitedResource, agentId?: string): Promise<{
    limit: number | null | undefined;
    count: number | null;
    reached: boolean;
}> {
    if (isSystemAdmin(agentId)) return { limit: null, count: null, reached: false };

    const getAppInstance = auth.elevate(appInstances.getAppInstance);
    const { instance } = await getAppInstance();
    const packageName = instance?.billing?.packageName?.trim() ?? '';
    const limit = getLimit(packageName, resource);
    if (limit === undefined || limit === null) return { limit, count: null, reached: false };

    const queryItems = auth.elevate(items.query);
    const collection = resource === 'tickets'
        ? CollectionIds.TICKETS
        : resource === 'agents'
            ? CollectionIds.AGENTS
            : CollectionIds.TEAMS;
    let query = queryItems(collection);
    if (resource === 'tickets') {
        const periodStart = getCurrentBillingPeriodStart(instance?.billing?.timeStamp, new Date());
        if (!periodStart) throw new Error('The current billing period could not be determined');
        query = query.ge('_createdDate', periodStart);
    }

    const count = await query.count({ consistentRead: true });
    return { limit, count, reached: count >= limit };
}

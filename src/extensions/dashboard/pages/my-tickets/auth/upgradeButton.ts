import { resolvePlanTier } from '../../../../../pages/api/utils/plan-config';

interface PlanLike {
    planName?: string | null;
    isFreePlan?: boolean | null;
}

// Single place that decides the upgrade button for the dashboard.
// Free: "Start Free Trial". Essential and Team: "Upgrade". Advanced: no button.
export function getUpgradeButton(appPlan: PlanLike | null | undefined): { show: boolean; label: string } {
    if (!appPlan) return { show: false, label: 'Upgrade' };
    const tier = resolvePlanTier(appPlan.planName, appPlan.isFreePlan === true);
    if (tier === 'advanced') return { show: false, label: 'Upgrade' };
    if (tier === 'free' || !appPlan.planName) return { show: true, label: 'Start Free Trial' };
    return { show: true, label: 'Upgrade' };
}

import { useEffect, useState } from 'react';
import { Box, Button, EmptyState, Page } from '@wix/design-system';
import type { CurrentAppPlan } from '../../auth/fetchCurrentAppPlan';
import { PermissionDeniedState, ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import type { SlaSettings } from '@jrapps/my_tickets_common_types';
import SlaSettingsWrapper from './sla-settings.wrapper';
import { fetchSlaSettings, saveSlaSettings } from './sla-settings';
import { getUpgradeButton } from '../../auth/upgradeButton';

let cachedSettings: SlaSettings | undefined;

interface SlaSettingsProps {
    permissions: string[];
    appPlan: CurrentAppPlan | null;
}

const SlaSettingsRoute = ({ permissions, appPlan }: SlaSettingsProps) => {
    const normalizedPlanName = typeof appPlan?.planName === 'string'
        ? appPlan.planName.toLowerCase().replace(/[ _-]/g, '')
        : '';
    const hasSlaPlan = normalizedPlanName.includes('team') || normalizedPlanName.includes('advanced');
    const planAccess: 'allowed' | 'restricted' | 'error' = !appPlan ? 'error' : hasSlaPlan ? 'allowed' : 'restricted';
    const upgradeUrl = appPlan?.upgradeUrl;

    if (!permissions.includes('my-tickets-manage-sla-settings')) return <PermissionDeniedState />;

    if (planAccess !== 'allowed') {
        return (
            <Page maxWidth={9999} className="sla-settings-page">
                <Page.Header
                    title="SLA Settings"
                    actionsBar={planAccess === 'restricted' && upgradeUrl && getUpgradeButton(appPlan).show ? (
                        <Button skin="premium" priority="primary" onClick={() => window.open(upgradeUrl, '_blank', 'noopener,noreferrer')}>
                            {getUpgradeButton(appPlan).label}
                        </Button>
                    ) : undefined}
                />
                <Page.Content>
                    <Box width="100%" height="100%" align="center" verticalAlign="middle">
                        <EmptyState
                            skin="page"
                            title={planAccess === 'restricted' ? 'SLA Settings require a Team or Advanced plan' : 'Could not check your plan'}
                            subtitle={planAccess === 'restricted'
                                ? 'Upgrade your plan to configure service level targets.'
                                : 'Refresh the page and try again.'}
                        >
                            {planAccess === 'restricted' && upgradeUrl && getUpgradeButton(appPlan).show && (
                                <Button skin="premium" priority="primary" onClick={() => window.open(upgradeUrl, '_blank', 'noopener,noreferrer')}>
                                    {getUpgradeButton(appPlan).label}
                                </Button>
                            )}
                        </EmptyState>
                    </Box>
                </Page.Content>
            </Page>
        );
    }

    return <SlaSettingsContent permissions={permissions} />;
};

const SlaSettingsContent = ({ permissions }: Pick<SlaSettingsProps, 'permissions'>) => {
    const [settings, setSettings] = useState<SlaSettings | undefined>(cachedSettings);
    const [isLoading, setIsLoading] = useState(!cachedSettings);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!permissions.includes('my-tickets-manage-sla-settings')) {
            setIsLoading(false);
            return;
        }
        fetchSlaSettings()
            .then((data) => {
                cachedSettings = data;
                setSettings(data);
            })
            .catch((error: Error) => {
                if (!cachedSettings) ShowToast({ message: error.message, type: 'error' });
            })
            .finally(() => setIsLoading(false));
    }, [permissions]);

    const handleSave = async (next: SlaSettings) => {
        setIsSaving(true);
        try {
            const saved = await saveSlaSettings(next);
            cachedSettings = saved;
            setSettings(saved);
            ShowToast({ message: 'SLA settings saved', type: 'success' });
        } catch (error: any) {
            ShowToast({ message: error.message, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return <SlaSettingsWrapper settings={settings} isLoading={isLoading} isSaving={isSaving} permissions={permissions} onSave={handleSave} />;
};

export default SlaSettingsRoute;

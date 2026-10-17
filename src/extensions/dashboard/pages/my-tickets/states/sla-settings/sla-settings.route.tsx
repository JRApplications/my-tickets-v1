import { useEffect, useState } from 'react';
import { Box, Button, EmptyState, Loader, Page } from '@wix/design-system';
import { httpClient } from '@wix/essentials';
import { PermissionDeniedState, ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import type { SlaSettings } from '@jrapps/my_tickets_common_types';
import SlaSettingsWrapper from './sla-settings.wrapper';
import { fetchSlaSettings, saveSlaSettings } from './sla-settings';

let cachedSettings: SlaSettings | undefined;

interface SlaSettingsProps {
    permissions: string[];
}

const SlaSettingsRoute = ({ permissions }: SlaSettingsProps) => {
    const [planAccess, setPlanAccess] = useState<'loading' | 'allowed' | 'restricted' | 'error'>('loading');
    const [upgradeUrl, setUpgradeUrl] = useState<string>();

    useEffect(() => {
        let isMounted = true;
        const checkPlan = async () => {
            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/my-tickets-auth/app-plan`);
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load your plan');
                const normalizedPlanName = typeof result.planName === 'string'
                    ? result.planName.toLowerCase().replace(/[ _-]/g, '')
                    : '';
                const hasSlaPlan = normalizedPlanName.includes('team') || normalizedPlanName.includes('advanced');
                if (isMounted) {
                    setUpgradeUrl(typeof result.upgradeUrl === 'string' ? result.upgradeUrl : undefined);
                    setPlanAccess(hasSlaPlan ? 'allowed' : 'restricted');
                }
            } catch (error) {
                console.error('Failed to check the plan for SLA Settings', error);
                if (isMounted) setPlanAccess('error');
            }
        };
        void checkPlan();
        return () => { isMounted = false; };
    }, []);

    if (!permissions.includes('my-tickets-manage-sla-settings')) return <PermissionDeniedState />;

    if (planAccess !== 'allowed') {
        return (
            <Page maxWidth={9999} className="sla-settings-page">
                <Page.Header
                    title="SLA Settings"
                    actionsBar={planAccess === 'restricted' && upgradeUrl ? (
                        <Button skin="premium" priority="primary" onClick={() => window.open(upgradeUrl, '_blank', 'noopener,noreferrer')}>
                            Upgrade plan
                        </Button>
                    ) : undefined}
                />
                <Page.Content>
                    <Box width="100%" height="100%" align="center" verticalAlign="middle">
                        {planAccess === 'loading' ? (
                            <Loader />
                        ) : (
                            <EmptyState
                                skin="page"
                                title={planAccess === 'restricted' ? 'SLA Settings require a Team or Advanced plan' : 'Could not check your plan'}
                                subtitle={planAccess === 'restricted'
                                    ? 'Upgrade your plan to configure service level targets.'
                                    : 'Refresh the page and try again.'}
                            >
                                {planAccess === 'restricted' && upgradeUrl && (
                                    <Button skin="premium" priority="primary" onClick={() => window.open(upgradeUrl, '_blank', 'noopener,noreferrer')}>
                                        Upgrade plan
                                    </Button>
                                )}
                            </EmptyState>
                        )}
                    </Box>
                </Page.Content>
            </Page>
        );
    }

    return <SlaSettingsContent permissions={permissions} />;
};

const SlaSettingsContent = ({ permissions }: SlaSettingsProps) => {
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

import { useEffect, useState } from 'react';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import type { SlaSettings } from '@jrapps/my_tickets_common_types';
import SlaSettingsWrapper from './sla-settings.wrapper';
import { fetchSlaSettings, saveSlaSettings } from './sla-settings';

let cachedSettings: SlaSettings | undefined;

interface SlaSettingsProps {
    permissions: string[];
}

const SlaSettingsRoute = ({ permissions }: SlaSettingsProps) => {
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

import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Card,
    Dropdown,
    FormField,
    Input,
    Loader,
    NumberInput,
    Page,
    SectionHelper,
    SkeletonLine,
    SkeletonRectangle,
    Text,
    TextButton,
    ToggleSwitch,
} from '@wix/design-system';
import { PermissionDeniedState } from '@jrapps/my_tickets_dashboard_ui';
import type {
    SlaPriorityKey,
    SlaSettings,
    SlaTargets
} from '@jrapps/my_tickets_common_types';
import {
    formatSlaDuration,
    getDefaultSlaSettings,
    SLA_PRIORITIES
} from '@jrapps/my_tickets_common_types';
import { fetchTeams, type TeamOption } from './sla-settings';
import './sla-settings.css';

interface SlaSettingsWrapperProps {
    settings?: SlaSettings;
    isLoading: boolean;
    isSaving: boolean;
    permissions: string[];
    onSave: (settings: SlaSettings) => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const PRIORITY_LABELS: Record<SlaPriorityKey, string> = { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' };

const minutesToTime = (minutes: number): string => {
    const clamped = Math.min(Math.max(Math.round(minutes), 0), 1439);
    return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
};

const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0;
};

const getTimezoneOptions = (current: string) => {
    const supported: string[] = (Intl as any).supportedValuesOf?.('timeZone') ?? [];
    const zones = supported.includes(current) ? supported : [current, ...supported];
    return zones.map((zone) => ({ id: zone, value: zone }));
};

const PolicyGrid = ({ policies, onChange }: { policies: Record<SlaPriorityKey, SlaTargets>; onChange: (key: SlaPriorityKey, field: keyof SlaTargets, value: number) => void }) => (
    <Box direction="vertical" gap={2}>
        <Box gap={3}>
            <Box width="100px"><Text size="small" weight="bold">Priority</Text></Box>
            <Box width="180px"><Text size="small" weight="bold">First response (minutes)</Text></Box>
            <Box width="180px"><Text size="small" weight="bold">Next response (minutes)</Text></Box>
            <Box width="180px"><Text size="small" weight="bold">Resolution (minutes)</Text></Box>
        </Box>
        {SLA_PRIORITIES.map((key) => (
            <Box key={key} gap={3} verticalAlign="middle">
                <Box width="100px"><Text>{PRIORITY_LABELS[key]}</Text></Box>
                {(['firstResponseMinutes', 'nextResponseMinutes', 'resolutionMinutes'] as const).map((field) => (
                    <Box key={field} width="180px" direction="vertical">
                        <NumberInput
                            value={policies[key][field]}
                            min={0}
                            step={5}
                            onChange={(value) => onChange(key, field, value ?? 0)}
                        />
                        <Text size="tiny" secondary>{policies[key][field] > 0 ? formatSlaDuration(policies[key][field] * 60_000) : 'No target'}</Text>
                    </Box>
                ))}
            </Box>
        ))}
    </Box>
);

const SlaSettingsWrapper = ({ settings, isLoading, isSaving, permissions, onSave }: SlaSettingsWrapperProps) => {
    const [draft, setDraft] = useState<SlaSettings>(() => settings ?? getDefaultSlaSettings());
    const [teams, setTeams] = useState<TeamOption[]>([]);
    const [teamToAdd, setTeamToAdd] = useState<string>('');

    useEffect(() => {
        if (!settings) return;
        // Never-saved settings start in the browser's timezone so hours match the admin's expectations.
        const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setDraft(settings._id || !browserZone ? settings : { ...settings, timezone: browserZone });
    }, [settings]);

    useEffect(() => {
        fetchTeams().then(setTeams).catch(() => setTeams([]));
    }, []);

    const timezoneOptions = useMemo(() => getTimezoneOptions(draft.timezone), [draft.timezone]);
    const availableTeams = teams.filter((team) => !draft.teamOverrides.some((o) => o.teamId === team._id));

    if (!permissions.includes('my-tickets-manage-sla-settings')) return <PermissionDeniedState />;

    const update = (patch: Partial<SlaSettings>) => setDraft((prev) => ({ ...prev, ...patch }));

    const updatePolicy = (key: SlaPriorityKey, field: keyof SlaTargets, value: number) =>
        setDraft((prev) => ({ ...prev, policies: { ...prev.policies, [key]: { ...prev.policies[key], [field]: value } } }));

    const updateOverride = (teamId: string, key: SlaPriorityKey, field: keyof SlaTargets, value: number) =>
        setDraft((prev) => ({
            ...prev,
            teamOverrides: prev.teamOverrides.map((o) =>
                o.teamId === teamId ? { ...o, policies: { ...o.policies, [key]: { ...(o.policies[key] ?? prev.policies[key]), [field]: value } } } : o
            ),
        }));

    const updateDay = (day: number, patch: Partial<SlaSettings['businessHours'][number]>) =>
        setDraft((prev) => ({ ...prev, businessHours: prev.businessHours.map((d) => (d.day === day ? { ...d, ...patch } : d)) }));

    const addOverride = () => {
        const team = teams.find((t) => t._id === teamToAdd);
        if (!team) return;
        update({ teamOverrides: [...draft.teamOverrides, { teamId: team._id, teamName: team.name, policies: { ...draft.policies } }] });
        setTeamToAdd('');
    };

    const skeleton = (width: string, height = '35px') => <SkeletonRectangle width={width} height={height} />;

    return (
        <Page maxWidth={9999} className="sla-settings-page">
            <Page.Header
                title="SLA Settings"
                subtitle="Set first-response, next-response, and resolution targets, and when the clock runs."
                actionsBar={isLoading ? skeleton('120px') : <Button size="medium" onClick={() => onSave(draft)} disabled={isSaving}>{isSaving ? <Loader size="tiny" /> : 'Save'}</Button>}
            />
            <Page.Content>
                <Box direction="vertical" gap={4}>
                    <Card showShadow>
                        <Card.Header
                            title={isLoading ? <SkeletonLine width="200px" /> : 'SLA tracking'}
                            subtitle={isLoading ? <SkeletonLine width="400px" /> : 'Turn on to give every ticket first-response, next-response, and resolution deadlines.'}
                            suffix={isLoading ? skeleton('60px', '30px') : <ToggleSwitch checked={draft.enabled} onChange={() => update({ enabled: !draft.enabled })} />}
                        />
                        {draft.enabled && !isLoading && (
                            <Card.Content>
                                <Box direction="vertical" gap={3}>
                                    <FormField label="Mark as at risk after (% of the target elapsed)" labelPlacement="top">
                                        <Box width="200px">
                                            <NumberInput value={draft.atRiskThresholdPct} min={1} max={99} step={5} onChange={(value) => update({ atRiskThresholdPct: value ?? 75 })} />
                                        </Box>
                                    </FormField>
                                    <FormField label="Raise priority when an SLA is breached" labelPlacement="right" stretchContent={false}>
                                        <ToggleSwitch checked={draft.escalateOnBreach} onChange={() => update({ escalateOnBreach: !draft.escalateOnBreach })} />
                                    </FormField>
                                    <FormField label="Show customers the expected first response time" labelPlacement="right" stretchContent={false}>
                                        <ToggleSwitch checked={draft.showCustomerEta} onChange={() => update({ showCustomerEta: !draft.showCustomerEta })} />
                                    </FormField>
                                    <SectionHelper skin="standard" fullWidth>
                                        Alerts are sent to the assigned agent, or to the team when nobody is assigned. They are checked while an agent has the dashboard open, so an alert can arrive a few minutes after the deadline. A target of 0 means no target.
                                    </SectionHelper>
                                </Box>
                            </Card.Content>
                        )}
                    </Card>

                    <Card showShadow>
                        <Card.Header title={isLoading ? <SkeletonLine width="200px" /> : 'Targets by priority'} subtitle={isLoading ? <SkeletonLine width="400px" /> : 'Applies to every team unless it has its own override below.'} />
                        <Card.Content>
                            {isLoading ? skeleton('100%', '160px') : <PolicyGrid policies={draft.policies} onChange={updatePolicy} />}
                        </Card.Content>
                    </Card>

                    <Card showShadow>
                        <Card.Header title="Rules-based escalation" subtitle="When an SLA is breached, apply the first matching rule to raise priority. Rules are optional and run only while SLA tracking is enabled." />
                        <Card.Content>
                            {isLoading ? skeleton('100%', '35px') : (
                                <Box direction="vertical" gap={3}>
                                    {draft.escalationRules.map((rule, index) => (
                                        <Box key={rule.id} direction="vertical" gap={2} border="1px solid #DFE5EB" borderRadius="8px" padding="12px">
                                            <Box align="space-between" verticalAlign="middle">
                                                <Text weight="bold">Rule {index + 1}</Text>
                                                <TextButton size="small" skin="destructive" onClick={() => update({ escalationRules: draft.escalationRules.filter((item) => item.id !== rule.id) })}>Remove</TextButton>
                                            </Box>
                                            <Box gap={2} verticalAlign="middle">
                                                <Box width="220px"><FormField label="Rule name"><Input value={rule.name} onChange={(e) => update({ escalationRules: draft.escalationRules.map((item) => item.id === rule.id ? { ...item, name: e.target.value } : item) })} /></FormField></Box>
                                                <FormField label="Enabled"><ToggleSwitch checked={rule.enabled} onChange={() => update({ escalationRules: draft.escalationRules.map((item) => item.id === rule.id ? { ...item, enabled: !item.enabled } : item) })} /></FormField>
                                                <Box width="160px"><FormField label="If priority is"><Dropdown options={[{ id: 'any', value: 'Any priority' }, ...SLA_PRIORITIES.map((value) => ({ id: value, value }))]} selectedId={rule.priority || 'any'} onSelect={(option) => update({ escalationRules: draft.escalationRules.map((item) => item.id === rule.id ? { ...item, priority: option.id === 'any' ? undefined : option.id as SlaPriorityKey } : item) })} /></FormField></Box>
                                                <Box width="200px"><FormField label="Assigned team"><Dropdown options={[{ id: 'any', value: 'Any team' }, ...teams.map((team) => ({ id: team._id, value: team.name }))]} selectedId={rule.teamId || 'any'} onSelect={(option) => update({ escalationRules: draft.escalationRules.map((item) => item.id === rule.id ? { ...item, teamId: option.id === 'any' ? undefined : String(option.id) } : item) })} /></FormField></Box>
                                                <Box width="160px"><FormField label="Tag contains"><Input value={rule.tag || ''} onChange={(e) => update({ escalationRules: draft.escalationRules.map((item) => item.id === rule.id ? { ...item, tag: e.target.value || undefined } : item) })} /></FormField></Box>
                                                <Box width="160px"><FormField label="Raise priority to"><Dropdown options={SLA_PRIORITIES.map((value) => ({ id: value, value }))} selectedId={rule.setPriority} onSelect={(option) => update({ escalationRules: draft.escalationRules.map((item) => item.id === rule.id ? { ...item, setPriority: option.id as SlaPriorityKey } : item) })} /></FormField></Box>
                                            </Box>
                                        </Box>
                                    ))}
                                    <Button priority="secondary" onClick={() => update({ escalationRules: [...draft.escalationRules, { id: crypto.randomUUID(), enabled: true, name: `Escalation rule ${draft.escalationRules.length + 1}`, setPriority: 'urgent' }] })}>Add rule</Button>
                                </Box>
                            )}
                        </Card.Content>
                    </Card>

                    <Card showShadow>
                        <Card.Header
                            title={isLoading ? <SkeletonLine width="200px" /> : 'Business hours'}
                            subtitle={isLoading ? <SkeletonLine width="400px" /> : 'The SLA clock only runs during these hours. Turn on 24/7 to count every hour.'}
                            suffix={isLoading ? skeleton('60px', '30px') : <ToggleSwitch checked={draft.alwaysOn} onChange={() => update({ alwaysOn: !draft.alwaysOn })} />}
                        />
                        {!draft.alwaysOn && !isLoading && (
                            <Card.Content>
                                <Box direction="vertical" gap={3}>
                                    <FormField label="Timezone">
                                        <Dropdown options={timezoneOptions} selectedId={draft.timezone} onSelect={(option) => update({ timezone: String(option.id) })} />
                                    </FormField>
                                    {DAY_ORDER.map((day) => {
                                        const hours = draft.businessHours.find((d) => d.day === day)!;
                                        return (
                                            <Box key={day} gap={3} verticalAlign="middle">
                                                <Box width="110px"><Text>{DAY_NAMES[day]}</Text></Box>
                                                <ToggleSwitch size="small" checked={!hours.closed} onChange={() => updateDay(day, { closed: !hours.closed })} />
                                                <Box width="140px"><Input type="time" disabled={hours.closed} value={minutesToTime(hours.startMinute)} onChange={(e) => updateDay(day, { startMinute: timeToMinutes(e.target.value) })} /></Box>
                                                <Text size="small" secondary>to</Text>
                                                <Box width="140px"><Input type="time" disabled={hours.closed} value={minutesToTime(hours.endMinute)} onChange={(e) => updateDay(day, { endMinute: timeToMinutes(e.target.value) })} /></Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Card.Content>
                        )}
                    </Card>

                    <Card showShadow>
                        <Card.Header title={isLoading ? <SkeletonLine width="200px" /> : 'Team overrides'} subtitle={isLoading ? <SkeletonLine width="400px" /> : 'Give a team its own targets. Teams without an override use the table above.'} />
                        <Card.Content>
                            {isLoading ? skeleton('100%') : (
                                <Box direction="vertical" gap={4}>
                                    {draft.teamOverrides.map((override) => (
                                        <Box key={override.teamId} direction="vertical" gap={2} border="1px solid #DFE5EB" borderRadius="8px" padding="12px">
                                            <Box align="space-between" verticalAlign="middle">
                                                <Text weight="bold">{override.teamName || override.teamId}</Text>
                                                <TextButton size="small" skin="destructive" onClick={() => update({ teamOverrides: draft.teamOverrides.filter((o) => o.teamId !== override.teamId) })}>Remove</TextButton>
                                            </Box>
                                            <PolicyGrid
                                                policies={Object.fromEntries(SLA_PRIORITIES.map((key) => [key, override.policies[key] ?? draft.policies[key]])) as Record<SlaPriorityKey, SlaTargets>}
                                                onChange={(key, field, value) => updateOverride(override.teamId, key, field, value)}
                                            />
                                        </Box>
                                    ))}
                                    <Box gap={2} verticalAlign="bottom">
                                        <Box width="300px">
                                            <FormField label="Add a team override">
                                                <Dropdown options={availableTeams.map((t) => ({ id: t._id, value: t.name }))} selectedId={teamToAdd} onSelect={(option) => setTeamToAdd(String(option.id))} placeholder="Select a team" />
                                            </FormField>
                                        </Box>
                                        <Button size="medium" priority="secondary" disabled={!teamToAdd} onClick={addOverride}>Add</Button>
                                    </Box>
                                </Box>
                            )}
                        </Card.Content>
                    </Card>
                </Box>
            </Page.Content>
        </Page >
    );
};

export default SlaSettingsWrapper;

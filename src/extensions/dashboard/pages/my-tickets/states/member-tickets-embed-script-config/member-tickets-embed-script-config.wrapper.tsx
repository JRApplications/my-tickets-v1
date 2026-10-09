import { embeddedScripts } from '@wix/app-management';
import { dashboard } from '@wix/dashboard';
import {
    Box,
    Button,
    Card,
    ColorInput,
    FormField,
    Loader,
    NumberInput,
    Page,
    Tabs,
    Text,
    ToggleSwitch,
    SkeletonRectangle,
    SkeletonLine,
} from '@wix/design-system';
import { useEffect, useRef, useState, type FC } from 'react';
import MemberTicketsPreview from './components/MemberTickets';
import type { MemberTicketsDesignElement, MemberTicketsTheme } from './member-tickets-embed-script-config.types';
import { PermissionDeniedState, ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import { ExtensionIds } from '@jrapps/my_tickets_common_types';
import { buildThemeVars, defaultTheme } from './utils/theme';
import './member-tickets-embed-script-config.css';

type PreviewState =
    | 'loading'
    | 'noTickets'
    | 'selectedTicketLoading'
    | 'selectedTicket'
    | 'tickets';

type MemberTicketsSettings = {
    enabled: boolean;
    theme: Partial<MemberTicketsTheme>;
};

type ThemeColorField = Exclude<keyof MemberTicketsTheme, 'borderRadius'>;
type ThemeOptionGroup = 'colors' | 'messages' | 'loading';

const themeColorOptions: { field: ThemeColorField; label: string; group: ThemeOptionGroup }[] = [
    { field: 'primary', label: 'Accent color (buttons, status, links)', group: 'colors' },
    { field: 'panelBackground', label: 'Widget background', group: 'colors' },
    { field: 'surface', label: 'Card / row surface color', group: 'colors' },
    { field: 'border', label: 'Border color', group: 'colors' },
    { field: 'divider', label: 'Divider color', group: 'colors' },
    { field: 'text', label: 'Text color', group: 'colors' },
    { field: 'textSecondary', label: 'Secondary text color', group: 'colors' },
    { field: 'muted', label: 'Muted icon color', group: 'colors' },
    { field: 'ink', label: 'Control text color', group: 'colors' },
    { field: 'emptyIconColor', label: 'Empty-state icon color', group: 'colors' },
    { field: 'agentBubbleBackground', label: 'Agent bubble background', group: 'messages' },
    { field: 'agentBubbleText', label: 'Agent bubble text', group: 'messages' },
    { field: 'agentNameColor', label: 'Agent name color', group: 'messages' },
    { field: 'memberBubbleBackground', label: 'Member bubble background', group: 'messages' },
    { field: 'memberBubbleText', label: 'Member bubble text', group: 'messages' },
    { field: 'memberNameColor', label: "'Me' label color", group: 'messages' },
    { field: 'skeletonBase', label: 'Skeleton base color', group: 'loading' },
    { field: 'skeletonShine', label: 'Skeleton shine color', group: 'loading' },
];

const themeFieldsByElement: Record<MemberTicketsDesignElement, readonly (keyof MemberTicketsTheme)[]> = {
    widget: ['primary', 'panelBackground', 'border', 'divider', 'text', 'textSecondary', 'muted', 'ink', 'emptyIconColor', 'borderRadius'],
    filterDropdown: ['surface', 'border', 'divider', 'muted', 'ink'],
    searchInput: ['surface', 'border', 'divider', 'muted', 'ink'],
    ticketCard: ['surface', 'border', 'divider', 'text', 'textSecondary', 'primary'],
    emptyIcon: ['emptyIconColor'],
    emptyTitle: ['text'],
    emptySubtitle: ['textSecondary'],
    emptyButton: ['primary'],
    backButton: ['primary', 'border', 'ink'],
    ticketNumber: ['ink', 'text'],
    agentBubble: ['agentBubbleBackground', 'agentBubbleText'],
    agentName: ['agentNameColor'],
    memberBubble: ['memberBubbleBackground', 'memberBubbleText'],
    memberName: ['memberNameColor'],
    replyInput: ['border', 'ink'],
    sendButton: ['primary', 'border', 'ink'],
    loadingSkeleton: ['skeletonBase', 'skeletonShine'],
};

const designElementLabels: Record<MemberTicketsDesignElement, string> = {
    widget: 'Widget',
    filterDropdown: 'Status filter',
    searchInput: 'Search field',
    ticketCard: 'Ticket card',
    emptyIcon: 'Empty state icon',
    emptyTitle: 'Empty state title',
    emptySubtitle: 'Empty state subtitle',
    emptyButton: 'Create ticket button',
    backButton: 'Back button',
    ticketNumber: 'Ticket number',
    agentBubble: 'Agent message bubble',
    agentName: 'Agent name',
    memberBubble: 'Member message bubble',
    memberName: 'Member name',
    replyInput: 'Reply field',
    sendButton: 'Send button',
    loadingSkeleton: 'Loading skeleton',
};

const defaultSettings: MemberTicketsSettings = {
    enabled: false,
    theme: { ...defaultTheme },
};

interface ColorRowProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    isLoading: boolean;
}

const ColorRow: FC<ColorRowProps> = ({ label, value, onChange, isLoading }) => (
    isLoading ? <SkeletonRectangle width="100%" height="35px" /> :
        <FormField label={label}>
            <ColorInput
                value={value}
                onChange={(c) => onChange(typeof c === 'string' ? c : (c as any).hex ?? value)}
                popoverAppendTo="window"
            />
        </FormField>
);

const MemberTicketsEmbedScriptConfigWrapper: FC<{ permissions: string[] }> = ({ permissions }) => {
    const [settings, setSettings] = useState<MemberTicketsSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [previewState, setPreviewState] = useState<PreviewState>('tickets');
    const [selectedDesignElement, setSelectedDesignElement] = useState<{ element: MemberTicketsDesignElement; id: string } | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    const hasPermission = permissions.includes("my-tickets-manage-member-tickets-design");

    useEffect(() => {
        const load = async () => {
            try {
                const { parameters } = await embeddedScripts.getEmbeddedScript({ componentId: ExtensionIds.MEMBER_TICKETS_EMBED_SCRIPT });
                const theme =
                    parameters?.themeB64
                        ? JSON.parse(atob(parameters?.themeB64))
                        : { ...defaultTheme };

                const newSettings: MemberTicketsSettings = {
                    enabled: parameters?.enabled ? true : false,
                    theme,
                };
                setSettings(newSettings);
            } catch (err) {
                const errorString = JSON.stringify(err);
                const parsedError = JSON.parse(errorString);
                const errorCode = parsedError?.details.applicationError.code;
                if (errorCode === 'NO_HTML_EMBEDS_ON_SITE') {
                    await handleSave();
                    return;
                }
                console.error('Failed to load member tickets widget settings:', err);
                ShowToast({ message: 'Failed to load member tickets widget settings', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const clearSelectionOutsidePreview = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (previewRef.current?.contains(target)) return;
            if (target.closest('.member-tickets-design-options')) return;
            setSelectedDesignElement(null);
        };

        document.addEventListener('pointerdown', clearSelectionOutsidePreview);
        return () => document.removeEventListener('pointerdown', clearSelectionOutsidePreview);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await embeddedScripts.embedScript(
                {
                    parameters: {
                        enabled: String(settings.enabled),
                        themeB64: btoa(JSON.stringify(settings.theme)),
                    },
                },
                { componentId: ExtensionIds.MEMBER_TICKETS_EMBED_SCRIPT },
            );
            ShowToast({ message: 'Settings saved!', type: 'success' });
        } catch (err) {
            console.error('Failed to save member tickets widget settings:', err);
            dashboard.showToast({ message: 'Failed to save settings', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const setTheme = (patch: Partial<MemberTicketsTheme>) =>
        setSettings((prev) => ({ ...prev, theme: { ...prev.theme, ...patch } }));

    const setThemeField = (field: ThemeColorField, value: string) =>
        setSettings((prev) => ({ ...prev, theme: { ...prev.theme, [field]: value } }));

    const t = { ...defaultTheme, ...settings.theme } as MemberTicketsTheme;

    const previewVars = buildThemeVars(settings.theme) as React.CSSProperties;
    const visibleThemeFields = new Set<keyof MemberTicketsTheme>(
        selectedDesignElement
            ? themeFieldsByElement[selectedDesignElement.element]
            : [...themeColorOptions.map(({ field }) => field), 'borderRadius'],
    );
    const colorOptionsFor = (group: ThemeOptionGroup) =>
        themeColorOptions.filter(({ field, group: optionGroup }) =>
            optionGroup === group && visibleThemeFields.has(field),
        );
    const colorCardOptions = colorOptionsFor('colors');
    const messageCardOptions = colorOptionsFor('messages');
    const loadingCardOptions = colorOptionsFor('loading');
    const renderColorRows = (options: typeof themeColorOptions) => options.map(({ field, label }) => (
        <ColorRow
            key={field}
            label={label}
            value={t[field]}
            onChange={(value) => setThemeField(field, value)}
            isLoading={isLoading}
        />
    ));

    if (!hasPermission) {
        return <PermissionDeniedState />;
    }

    return (
        <Page maxWidth={9999} className="member-tickets-embed-script-config-page">
            <Page.Header
                title="Member Tickets Design"
                actionsBar={isLoading ? <SkeletonRectangle width="120px" height="35px" /> : <Button size="medium" onClick={handleSave}>{isSaving ? <Loader size="tiny" /> : 'Save'}</Button>}
            />
            <Page.Content>
                <Box direction="vertical" width="100%">

                    {hasPermission && (
                        <Box className="member-tickets-embed-script-config-empty-state-container" direction="vertical" gap={4}>
                            <Box direction="vertical" gap="24px">
                                {/* ── Live Preview (full width — the widget renders at 100% of its container) ── */}
                                <Card>
                                    <Card.Header
                                        title="Live Preview"
                                        subtitle={
                                            isLoading ?
                                                <Box gap={2}>
                                                    <SkeletonLine width="70px" />
                                                    <SkeletonLine width="70px" />
                                                    <SkeletonLine width="70px" />
                                                    <SkeletonLine width="70px" />
                                                    <SkeletonLine width="70px" />
                                                </Box>
                                                : (
                                                    <Tabs
                                                        horizontalPadding={false}
                                                        activeId={previewState}
                                                        onClick={({ id }) => setPreviewState(id as PreviewState)}
                                                        size="small"
                                                        items={[
                                                            { id: 'tickets', title: 'Tickets' },
                                                            { id: 'selectedTicket', title: 'Selected Ticket' },
                                                            { id: 'noTickets', title: 'No Tickets' },
                                                            { id: 'loading', title: 'Loading' },
                                                            { id: 'selectedTicketLoading', title: 'Ticket Loading' },
                                                        ]}
                                                    />
                                                )}
                                    />
                                    <Card.Content>
                                        {isLoading ? <SkeletonRectangle width="100%" height="640px" /> : (
                                            <Box
                                                className="member-tickets-preview-stage"
                                                borderRadius="8px"
                                                padding="16px"
                                                height="640px"
                                                width="100%"
                                                boxSizing="border-box"
                                            >
                                                <div ref={previewRef} style={{ ...previewVars, width: '100%', height: '100%' }}>
                                                    <MemberTicketsPreview
                                                        id="test-preview"
                                                        state={previewState}
                                                        selectedDesignElement={selectedDesignElement}
                                                        onDesignElementSelect={setSelectedDesignElement}
                                                    />
                                                </div>
                                            </Box>
                                        )}
                                    </Card.Content>
                                </Card>

                                {/* ── Design settings ── */}
                                <Box className="member-tickets-design-options" direction="vertical" gap="24px">
                                    <Text secondary size="small">
                                        {selectedDesignElement
                                            ? `Editing ${designElementLabels[selectedDesignElement.element]}. Click outside the preview and design controls to show all options.`
                                            : 'Select an element in the preview to filter its design options.'}
                                    </Text>
                                    {/* Toggles */}
                                    {!selectedDesignElement && <Card>
                                        <Card.Header title="General" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="18px">
                                                <Box align="space-between" verticalAlign="middle">
                                                    <Box direction="vertical" gap="2px">
                                                        {isLoading ? <SkeletonLine width="200px" /> : <Text weight="normal">Enable Member Tickets Widget</Text>}
                                                        {isLoading ? <SkeletonLine width="400px" /> : <Text secondary size="small">
                                                            Show the member tickets widget on the member's area pages.
                                                        </Text>}
                                                    </Box>
                                                    {isLoading ? <SkeletonRectangle width="60px" height="25px" /> : <ToggleSwitch
                                                        checked={settings.enabled}
                                                        onChange={(e) =>
                                                            setSettings((prev) => ({ ...prev, enabled: e.target.checked }))
                                                        }
                                                    />}
                                                </Box>
                                            </Box>
                                        </Card.Content>
                                    </Card>}

                                    {/* Colors */}
                                    {colorCardOptions.length > 0 && <Card>
                                        <Card.Header title="Colors" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="16px">
                                                {renderColorRows(colorCardOptions)}
                                            </Box>
                                        </Card.Content>
                                    </Card>}

                                    {/* Selected Ticket / Messages */}
                                    {messageCardOptions.length > 0 && <Card>
                                        <Card.Header title="Message Bubbles" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="16px">
                                                {renderColorRows(messageCardOptions)}
                                            </Box>
                                        </Card.Content>
                                    </Card>}

                                    {/* Shape */}
                                    {visibleThemeFields.has('borderRadius') && <Card>
                                        <Card.Header title="Shape" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="16px">
                                                {isLoading ? <SkeletonRectangle width="100%" height="35px" /> : (
                                                    <FormField label="Widget corner radius (px)">
                                                        <NumberInput
                                                            value={t.borderRadius}
                                                            onChange={(v) => setTheme({ borderRadius: v ?? 0 })}
                                                            min={0}
                                                            max={32}
                                                            step={1}
                                                        />
                                                    </FormField>
                                                )}
                                            </Box>
                                        </Card.Content>
                                    </Card>}

                                    {/* Loading State */}
                                    {loadingCardOptions.length > 0 && <Card>
                                        <Card.Header title="Loading State" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="16px">
                                                {renderColorRows(loadingCardOptions)}
                                            </Box>
                                        </Card.Content>
                                    </Card>}
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Page.Content>
        </Page>
    )
}

export default MemberTicketsEmbedScriptConfigWrapper;

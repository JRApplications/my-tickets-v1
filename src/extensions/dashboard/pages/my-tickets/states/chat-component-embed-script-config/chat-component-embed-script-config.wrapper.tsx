import { embeddedScripts } from '@wix/app-management';
import { dashboard } from '@wix/dashboard';
import {
    Box,
    Button,
    Accordion,
    Card,
    Cell,
    ColorInput,
    FormField,
    Layout,
    Loader,
    NumberInput,
    Page,
    Tabs,
    Text,
    ToggleSwitch,
    SkeletonRectangle,
    SkeletonLine,
} from '@wix/design-system';
import { Children, isValidElement, useEffect, useState, type FC, type ReactElement, type ReactNode } from 'react';
import { ExtensionIds } from '@jrapps/my_tickets_common_types';
import { ChatWidgetPreview, ChatEndedPreview, LauncherPreview, StartChatPreview } from './components/ChatPreview';
import type { ChatTheme, OfflineFormSchema } from './chat-component-embed-script-config.types';
import { defaultOfflineForm, OfflineFormBuilder, OfflineFormPreview } from './OfflineFormBuilder';
import { defaultTheme } from './utils/theme';
import './chat-component-embed-script-config.css';
import { PermissionDeniedState, ShowToast } from '@jrapps/my_tickets_dashboard_ui';

type ChatSettings = {
    enabled: boolean;
    demoData: boolean;
    theme: Partial<ChatTheme>;
    offlineForm: OfflineFormSchema;
};

const defaultSettings: ChatSettings = {
    enabled: false,
    demoData: false,
    theme: { ...defaultTheme },
    offlineForm: defaultOfflineForm,
};

const decodeBase64Json = <T,>(value: string, fallback: T): T => {
    try {
        const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes)) as T;
    } catch {
        return fallback;
    }
};

const encodeBase64Json = (value: unknown) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
};

interface ColorRowProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    isLoading: boolean;
}

const ColorRow: FC<ColorRowProps> = ({ label, value, onChange, isLoading }) => (
    isLoading ? <SkeletonRectangle width='100%' height='35px' /> :
        <FormField label={label}>
            <ColorInput
                value={value}
                onChange={(c) => onChange(typeof c === 'string' ? c : (c as any).hex ?? value)}
                popoverAppendTo="window"
            />
        </FormField>
);

const CollapsibleSettingsCard: FC<{ children: ReactNode; initiallyOpen?: boolean }> = ({ children, initiallyOpen = false }) => {
    const sections = Children.toArray(children).filter(isValidElement) as ReactElement<any>[];
    const header = sections.find((section) => section.type === Card.Header);
    const content = sections.find((section) => section.type === Card.Content);

    if (!header || !content) return <>{children}</>;

    return (
        <Accordion
            items={[{
                title: header.props.title,
                subtitle: header.props.subtitle,
                children: content.props.children,
                initiallyOpen,
                showLabel: 'always',
            }]}
        />
    );
};

const ChatComponentEmbedScriptConfigWrapper: FC<{ permissions: string[] }> = ({ permissions }) => {
    const [settings, setSettings] = useState<ChatSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const hasPermission = permissions && permissions.includes('my-tickets-manage-chat-widget-design');

    useEffect(() => {
        const load = async () => {
            try {
                const { parameters } = await embeddedScripts.getEmbeddedScript({ componentId: ExtensionIds.CHAT_WIDGET_EMBED_SCRIPT });
                const theme = parameters?.themeB64
                    ? decodeBase64Json(parameters.themeB64, { ...defaultTheme })
                    : { ...defaultTheme };
                const offlineForm = parameters?.offlineFormB64
                    ? decodeBase64Json(parameters.offlineFormB64, defaultOfflineForm)
                    : defaultOfflineForm;

                const newSettings = {
                    enabled: parameters?.enabled ? true : false,
                    demoData: parameters?.demoData ? true : false,
                    theme,
                    offlineForm,
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
                console.error('Failed to load chat widget settings:', err);
                ShowToast({ message: 'Failed to load chat widget settings', type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await embeddedScripts.embedScript(
                {
                    parameters: {
                        enabled: String(settings.enabled),
                        demoData: String(settings.demoData),
                        themeB64: encodeBase64Json(settings.theme),
                        offlineFormB64: encodeBase64Json(settings.offlineForm),
                    },
                },
                { componentId: ExtensionIds.CHAT_WIDGET_EMBED_SCRIPT },
            );
            ShowToast({ message: 'Settings saved!', type: 'success' });
        } catch (err) {
            console.error('Failed to save chat widget settings:', err);
            dashboard.showToast({ message: 'Failed to save settings', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const setTheme = (patch: Partial<ChatTheme>) =>
        setSettings((prev) => ({ ...prev, theme: { ...prev.theme, ...patch } }));

    const t = settings.theme as ChatTheme;
    const [previewTab, setPreviewTab] = useState<number>(1);

    if (!hasPermission) {
        return <PermissionDeniedState />
    }


    return (
        <Page maxWidth={9999} className='chat-component-embed-script-config-page'>
            <Page.Header title="Chat Widget Settings" actionsBar={isLoading ? <SkeletonRectangle width='120px' height='35px' /> : <Button size='medium' onClick={handleSave}>{isSaving ? <Loader size='tiny' /> : 'Save'}</Button>} />
            <Page.Content>
                {hasPermission && (
                    <Box direction="vertical" width="100%">
                        <Layout>
                            {/* ── Left: controls ── */}
                            <Cell span={7}>
                                <Box direction="vertical" gap={'5px'}>
                                    <CollapsibleSettingsCard>
                                        <Card.Header title="Offline Form" subtitle="Customize the form shown to visitors when your team is offline." />
                                        <Card.Content>
                                            {isLoading ? <SkeletonRectangle width="100%" height="300px" /> : (
                                                <OfflineFormBuilder
                                                    schema={settings.offlineForm}
                                                    onChange={(offlineForm) => setSettings((prev) => ({ ...prev, offlineForm }))}
                                                />
                                            )}
                                        </Card.Content>
                                    </CollapsibleSettingsCard>
                                    {/* Toggles */}
                                    <CollapsibleSettingsCard initiallyOpen>
                                        <Card.Header title="General" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="18px">
                                                <Box align="space-between" verticalAlign="middle">
                                                    <Box direction="vertical" gap="2px">
                                                        {isLoading ? <SkeletonLine width='200px' /> : <Text weight="normal">Enable Chat Widget</Text>}
                                                        {isLoading ? <SkeletonLine width='400px' /> : <Text secondary size="small">
                                                            Show the chat widget in the bottom-right corner of every page.
                                                        </Text>}
                                                    </Box>
                                                    {isLoading ? <SkeletonRectangle width='60px' height='25px' /> : <ToggleSwitch
                                                        checked={settings.enabled}
                                                        onChange={(e) =>
                                                            setSettings((prev) => ({ ...prev, enabled: e.target.checked }))
                                                        }
                                                    />}
                                                </Box>
                                                <Box align="space-between" verticalAlign="middle">
                                                    <Box direction="vertical" gap="2px">
                                                        {isLoading ? <SkeletonLine width='200px' /> : <Text weight="normal">Show Demo Data</Text>}
                                                        {isLoading ? <SkeletonLine width='400px' /> : <Text secondary size="small">
                                                            Display sample messages so you can preview the widget appearance.
                                                        </Text>}
                                                    </Box>
                                                    {isLoading ? <SkeletonRectangle width='60px' height='25px' /> : <ToggleSwitch
                                                        checked={settings.demoData}
                                                        onChange={(e) =>
                                                            setSettings((prev) => ({ ...prev, demoData: e.target.checked }))
                                                        }
                                                    />}
                                                </Box>
                                            </Box>
                                        </Card.Content>
                                    </CollapsibleSettingsCard>

                                    {/* Header */}
                                    <CollapsibleSettingsCard>
                                        <Card.Header title="Header" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="16px">
                                                <ColorRow
                                                    label="Background color"
                                                    value={t.primary}
                                                    onChange={(v) => setTheme({ primary: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Title, subtitle & close button color"
                                                    value={t.headerText ?? '#ffffff'}
                                                    onChange={(v) => setTheme({ headerText: v })}
                                                    isLoading={isLoading}
                                                />
                                            </Box>
                                        </Card.Content>
                                    </CollapsibleSettingsCard>

                                    {/* Message list */}
                                    <CollapsibleSettingsCard>
                                        <Card.Header title="Message List" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="16px">
                                                <ColorRow
                                                    label="Background color"
                                                    value={t.background}
                                                    onChange={(v) => setTheme({ background: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="User bubble color"
                                                    value={t.userBubble}
                                                    onChange={(v) => setTheme({ userBubble: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="User text color"
                                                    value={t.userText}
                                                    onChange={(v) => setTheme({ userText: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Agent bubble color"
                                                    value={t.agentBubble}
                                                    onChange={(v) => setTheme({ agentBubble: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Agent text color"
                                                    value={t.agentText}
                                                    onChange={(v) => setTheme({ agentText: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Agent name color"
                                                    value={t.systemText}
                                                    onChange={(v) => setTheme({ systemText: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Timestamp color"
                                                    value={t.systemText}
                                                    onChange={(v) => setTheme({ systemText: v })}
                                                    isLoading={isLoading}
                                                />
                                            </Box>
                                        </Card.Content>
                                    </CollapsibleSettingsCard>

                                    {/* Footer */}
                                    <CollapsibleSettingsCard>
                                        <Card.Header title="Footer" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="16px">
                                                <ColorRow
                                                    label="Background color"
                                                    value={t.inputBackground}
                                                    onChange={(v) => setTheme({ inputBackground: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Input border color"
                                                    value={t.inputBorder}
                                                    onChange={(v) => setTheme({ inputBorder: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Attachment & send button color"
                                                    value={t.primary}
                                                    onChange={(v) => setTheme({ primary: v })}
                                                    isLoading={isLoading}
                                                />
                                            </Box>
                                        </Card.Content>
                                    </CollapsibleSettingsCard>

                                    {/* Shape */}
                                    <CollapsibleSettingsCard>
                                        <Card.Header title="Shape" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="16px">
                                                {isLoading ? <SkeletonRectangle width="100%" height="35px" /> : (
                                                    <FormField label="Widget border radius (px)">
                                                        <NumberInput
                                                            value={t.borderRadius}
                                                            onChange={(v) => setTheme({ borderRadius: v ?? 0 })}
                                                            min={0}
                                                            max={32}
                                                            step={1}
                                                        />
                                                    </FormField>
                                                )}

                                                {isLoading ? <SkeletonRectangle width="100%" height="35px" /> : (
                                                    <FormField label="Button border radius (px)">
                                                        <NumberInput
                                                            value={t.buttonRadius}
                                                            onChange={(v) => setTheme({ buttonRadius: v ?? 0 })}
                                                            min={0}
                                                            max={32}
                                                            step={1}
                                                        />
                                                    </FormField>
                                                )}
                                            </Box>
                                        </Card.Content>
                                    </CollapsibleSettingsCard>

                                    {/* Start Chat State */}
                                    <CollapsibleSettingsCard>
                                        <Card.Header title="Start Chat State" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="16px">
                                                <ColorRow
                                                    label="Background color"
                                                    value={t.startBackground ?? t.background}
                                                    onChange={(v) => setTheme({ startBackground: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Text color"
                                                    value={t.startTextColor ?? t.agentText}
                                                    onChange={(v) => setTheme({ startTextColor: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Button background color"
                                                    value={t.startButtonColor ?? t.primary}
                                                    onChange={(v) => setTheme({ startButtonColor: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Button text color"
                                                    value={t.startButtonTextColor ?? '#ffffff'}
                                                    onChange={(v) => setTheme({ startButtonTextColor: v })}
                                                    isLoading={isLoading}
                                                />
                                            </Box>
                                        </Card.Content>
                                    </CollapsibleSettingsCard>

                                    {/* Loading State */}
                                    <CollapsibleSettingsCard>
                                        <Card.Header title="Loading State" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="16px">
                                                <ColorRow
                                                    label="Background color"
                                                    value={t.loadingBackground ?? t.background}
                                                    onChange={(v) => setTheme({ loadingBackground: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Text color"
                                                    value={t.loadingTextColor ?? t.agentText}
                                                    onChange={(v) => setTheme({ loadingTextColor: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Spinner color"
                                                    value={t.loadingSpinnerColor ?? t.primary}
                                                    onChange={(v) => setTheme({ loadingSpinnerColor: v })}
                                                    isLoading={isLoading}
                                                />
                                            </Box>
                                        </Card.Content>
                                    </CollapsibleSettingsCard>

                                    {/* Chat Ended State */}
                                    <CollapsibleSettingsCard>
                                        <Card.Header title="Chat Ended State" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="16px">
                                                <ColorRow
                                                    label="Background color"
                                                    value={t.endedBackground ?? t.background}
                                                    onChange={(v) => setTheme({ endedBackground: v })}
                                                    isLoading={isLoading}
                                                />
                                                <ColorRow
                                                    label="Text color"
                                                    value={t.endedTextColor ?? t.agentText}
                                                    isLoading={isLoading}
                                                    onChange={(v) => setTheme({ endedTextColor: v })}
                                                />
                                                <ColorRow
                                                    label="Icon color"
                                                    value={t.endedIconColor ?? t.primary}
                                                    isLoading={isLoading}
                                                    onChange={(v) => setTheme({ endedIconColor: v })}
                                                />
                                            </Box>
                                        </Card.Content>
                                    </CollapsibleSettingsCard>

                                    {/* Launcher Button */}
                                    <CollapsibleSettingsCard>
                                        <Card.Header title="Launcher Button" />
                                        <Card.Content>
                                            <Box direction="vertical" gap="16px">
                                                <ColorRow
                                                    label="Background color"
                                                    value={t.launcherBackground ?? t.primary}
                                                    isLoading={isLoading}
                                                    onChange={(v) => setTheme({ launcherBackground: v })}
                                                />
                                                <ColorRow
                                                    label="Icon color"
                                                    value={t.launcherIconColor ?? '#ffffff'}
                                                    isLoading={isLoading}
                                                    onChange={(v) => setTheme({ launcherIconColor: v })}
                                                />
                                                <ColorRow
                                                    label="Border color"
                                                    value={t.launcherBorderColor ?? '#ffffff'}
                                                    isLoading={isLoading}
                                                    onChange={(v) => setTheme({ launcherBorderColor: v })}
                                                />
                                                {isLoading ? <SkeletonRectangle width="100%" height="35px" /> : (
                                                    <FormField label="Size (px)">
                                                        <NumberInput
                                                            value={t.launcherSize ?? 56}
                                                            onChange={(v) => setTheme({ launcherSize: v ?? 56 })}
                                                            min={40}
                                                            max={80}
                                                            step={2}
                                                        />
                                                    </FormField>
                                                )}
                                                {isLoading ? <SkeletonRectangle width="100%" height="35px" /> : (
                                                    <FormField label="Border radius (px — 50 = circle)">
                                                        <NumberInput
                                                            value={t.launcherRadius ?? 50}
                                                            onChange={(v) => setTheme({ launcherRadius: v ?? 50 })}
                                                            min={0}
                                                            max={50}
                                                            step={1}
                                                        />
                                                    </FormField>
                                                )}
                                            </Box>
                                        </Card.Content>
                                    </CollapsibleSettingsCard>
                                </Box>
                            </Cell>

                            {/* ── Right: live preview ── */}

                            <Cell span={5}>
                                <Card className='sticky-live-preview-card'>
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
                                                        activeId={previewTab}
                                                        scrollOnOverflow
                                                        onClick={({ id }) => setPreviewTab(id as number)}
                                                        size="small"
                                                        items={[
                                                            { id: 1, title: 'Chat Widget' },
                                                            { id: 2, title: 'Start Chat' },
                                                            { id: 3, title: 'Chat Ended' },
                                                            { id: 4, title: 'Launcher' },
                                                            { id: 5, title: 'Offline Form' },
                                                        ]}
                                                    />
                                                )}
                                    />
                                    <Card.Content>
                                        {isLoading ? <SkeletonRectangle width="100%" height="640px" /> : (
                                            <Box
                                                direction="vertical"
                                                gap="12px"
                                                style={{ position: 'sticky', top: '24px' }}
                                            >

                                                {previewTab === 1 && (
                                                    <Box
                                                        borderRadius="8px"
                                                        padding="8px"
                                                        backgroundColor="#f0f0f0"
                                                        align="center"
                                                        verticalAlign="middle"
                                                        height="640px"
                                                        overflow="hidden"
                                                    >
                                                        <ChatWidgetPreview theme={settings.theme} width={380} height={620} />
                                                    </Box>
                                                )}
                                                {previewTab === 2 && (
                                                    <Box
                                                        borderRadius="8px"
                                                        padding="8px"
                                                        backgroundColor="#f0f0f0"
                                                        align="center"
                                                        verticalAlign="middle"
                                                        height="640px"
                                                        overflow="hidden"
                                                    >
                                                        <StartChatPreview theme={settings.theme} width={380} height={620} />
                                                    </Box>
                                                )}
                                                {previewTab === 3 && (
                                                    <Box
                                                        borderRadius="8px"
                                                        padding="8px"
                                                        backgroundColor="#f0f0f0"
                                                        align="center"
                                                        verticalAlign="middle"
                                                        height="640px"
                                                        overflow="hidden"
                                                    >
                                                        <ChatEndedPreview theme={settings.theme} width={380} height={620} />
                                                    </Box>
                                                )}
                                                {previewTab === 4 && (
                                                    <Box
                                                        borderRadius="8px"
                                                        padding="8px"
                                                        backgroundColor="#f0f0f0"
                                                        align="center"
                                                        verticalAlign="middle"
                                                        height="640px"
                                                        overflow="hidden"
                                                    >
                                                        <LauncherPreview theme={settings.theme} />
                                                    </Box>
                                                )}
                                                {previewTab === 5 && (
                                                    <Box borderRadius="8px" padding="8px" backgroundColor="#f0f0f0" align="center" verticalAlign="middle" height="640px" overflow="hidden">
                                                        <OfflineFormPreview schema={settings.offlineForm} theme={settings.theme as Record<string, any>} />
                                                    </Box>
                                                )}
                                            </Box>
                                        )}
                                    </Card.Content>
                                </Card>
                            </Cell>
                        </Layout>
                    </Box>
                )}
            </Page.Content>
        </Page>
    )
}

export default ChatComponentEmbedScriptConfigWrapper;

import { useState } from 'react';
import { Box, SidebarNext, SidebarItemNext, SidebarTitleItemNext, SidebarDividerNext, SidebarSubMenuNext, Button, IconButton, Tooltip, Heading, CounterBadge, SkeletonRectangle, Text } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common/odeditor';
import { Notifications } from './Notifications';
import AvatarDropdown from './footer/avatar-dropdown.wrapper';
import { StateId } from '@jrapps/my_tickets_common_types';

interface SidebarProps {
    stateId: StateId;
    onItemClick: (stateId: StateId) => void;
    onCreateTicketClicked: () => void;
    onInternalMailClicked: () => void;
    onAiButtonClicked: () => void;
    onLogout: () => void;
    permissions: string[];
    agentName: string;
    agentRole: string;
    agentProfilePictureUrl: string;
    teamId: string;
    onlineCount: number;
    agentStatus: 'online' | 'busy' | 'offline';
    onAgentStatusChange: (status: 'online' | 'busy' | 'offline') => void;
    notificationProps: {
        onNotificationRemove?: (id: string) => void;
        notifications?: { id: string; title: string; subtitle: string }[];
        isLoading?: boolean;
        isError?: boolean;
    }
    userBetaFeatures: string[];
    isLoading?: boolean;
}

const STATE_ID_TO_ITEM_KEY: Partial<Record<StateId, string>> = {
    [StateId.Home]: 'home',
    [StateId.ViewChats]: 'inbox-chats',
    [StateId.ViewTickets]: 'inbox-tickets',
    [StateId.OfflineFormSubmissions]: 'inbox-offline-submissions',
    [StateId.ManageTeams]: 'settings-teams',
    [StateId.Workforce]: 'team-workforce',
    [StateId.Reports]: 'reports',
    [StateId.ManageAgents]: 'settings-agents',
    [StateId.ManageRoles]: 'settings-roles',
    [StateId.MemberTicketsDesign]: 'settings-site-components-member-tickets',
    [StateId.ChatWidgetConfig]: 'settings-site-components-chat',
    [StateId.SlaSettings]: 'settings-sla',
    [StateId.ChatComponentEmbedScriptConfig]: 'settings-site-components-chat-widget',
    [StateId.GetSupport]: 'help',
};

const Sidebar = (props: SidebarProps) => {
    const selectedKey = STATE_ID_TO_ITEM_KEY[props.stateId];
    const [sidebarMinimized, setSidebarMinimized] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const currentUrl = new URL(import.meta.url);
    const logoUrl = currentUrl.origin + '/logo.png';

    return (
        <Box height='100%' width={sidebarMinimized ? undefined : '13%'} minWidth={sidebarMinimized ? '1px' : '255px'}  flexShrink={0}>
            <SidebarNext
                width={sidebarMinimized ? undefined : '100%'}
                isLoading={props.isLoading}
                minimized={sidebarMinimized}
                enableMinimizeToggle
                next
                skin="light"
                zIndex={1000}
                minimizeToggleTooltip={sidebarMinimized ? 'Expand' : 'Minimize'}
                onMinimizeToggleClick={() => setSidebarMinimized(!sidebarMinimized)}
                header={
                    <Box gap={2} width="100%" verticalAlign="middle" align={sidebarMinimized ? 'center' : 'left'}>
                        <img width={'32px'} height={'32px'} src={logoUrl} alt="My Tickets Logo" className='sidebar-logo' style={{ display: 'block', margin: '0' }} />
                        {!sidebarMinimized && (
                            <Box verticalAlign='middle' gap={3} width='100%' WebkitJustifyContent='space-between'>
                                <Heading size="large">My Tickets</Heading>
                                <Notifications
                                    isLoading={props.notificationProps.isLoading}
                                    isError={props.notificationProps.isError}
                                    onClose={() => setIsNotificationsOpen(false)}
                                    isOpen={isNotificationsOpen}
                                    notifications={props.notificationProps.notifications}
                                    onNotificationRemove={props.notificationProps.onNotificationRemove}
                                    triggerElement={
                                        <span style={{ position: 'relative', display: 'inline-block' }}>
                                            <IconButton size='small' skin='inverted' priority={'primary'} onClick={() => setIsNotificationsOpen(true)}>
                                                <Icons.Notification />
                                            </IconButton>
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    top: '-4px',
                                                    right: '-11px',
                                                    pointerEvents: 'none',
                                                }}
                                            >
                                                <CounterBadge skin="danger" showShadow>{`${props.notificationProps?.notifications?.length || 0}` || '0'}</CounterBadge>
                                            </div>
                                        </span>
                                    }
                                />
                            </Box>

                        )}
                    </Box>

                }
                footer={
                    <Box width={'100%'} direction='vertical' gap='0px' align={sidebarMinimized ? 'center' : undefined}>
                        {props.userBetaFeatures.includes('sidebar_ai') && (
                            sidebarMinimized ? (
                                props.isLoading ? null : (
                                    <Tooltip placement="right" content="My Tickets AI">
                                        <IconButton skin='ai' onClick={props.onAiButtonClicked}>
                                            <Icons.SparklesFilled />
                                        </IconButton>
                                    </Tooltip>
                                )
                            ) : (
                                props.isLoading ? (
                                    <SkeletonRectangle width="100%" height="35px" />
                                ) : (
                                    <Button skin='ai' prefixIcon={<Icons.SparklesFilled />} onClick={props.onAiButtonClicked}>
                                        My Tickets AI
                                    </Button>
                                )
                            )
                        )}


                        <Box width={'100%'} direction='vertical' gap='10px'>
                            <SidebarDividerNext />
                            <AvatarDropdown isLoading={props.isLoading} minimised={sidebarMinimized} permissions={props.permissions} status={props.agentStatus} onStatusChange={props.onAgentStatusChange} agentName={props.agentName} agentRole={props.agentRole} agentProfilePictureUrl={props.agentProfilePictureUrl} onLogout={props.onLogout} />
                        </Box>
                    </Box>
                }
                selectedKey={selectedKey}
            >
                {!sidebarMinimized && props.teamId && (
                    <SidebarTitleItemNext>
                        <Box width="100%" verticalAlign="middle" gap={2}>
                            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: props.onlineCount > 0 ? '#2e9d55' : '#a8a8a8', display: 'inline-block', flexShrink: 0 }} />
                            <Text size="small" weight="normal">Team coverage · {props.onlineCount} online</Text>
                        </Box>
                    </SidebarTitleItemNext>
                )}
                <SidebarItemNext
                    itemKey="home"
                    minimizedTooltipContent="Home"
                    prefix={<Icons.Home />}
                    onClick={() => props.onItemClick?.(StateId.Home)}
                >
                    Home
                </SidebarItemNext>
                <SidebarItemNext
                    prefix={<Icons.Compose />}
                    itemKey="create-ticket"
                    minimizedTooltipContent="Create Ticket"
                    onClick={() => props.onCreateTicketClicked?.()}
                >
                    Create Ticket
                </SidebarItemNext>

                <SidebarSubMenuNext
                    title="Inbox"
                    itemKey="inbox"
                    prefix={<Icons.Inbox />}
                    onClick={() => props.onItemClick?.(StateId.ViewTickets)}
                    as="div"
                >
                    <SidebarItemNext
                        itemKey="inbox-chats"
                        minimizedTooltipContent="Chats"
                        onClick={() => props.onItemClick?.(StateId.ViewChats)}
                    >
                        Chats
                    </SidebarItemNext>
                    <SidebarItemNext
                        itemKey="inbox-tickets"
                        minimizedTooltipContent="Tickets"
                        onClick={() => props.onItemClick?.(StateId.ViewTickets)}
                    >
                        Tickets
                    </SidebarItemNext>
                    {props.permissions.includes('my-tickets-view-offline-form-submissions') && <SidebarItemNext
                        itemKey="inbox-offline-submissions"
                        minimizedTooltipContent="Offline Submissions"
                        onClick={() => props.onItemClick?.(StateId.OfflineFormSubmissions)}
                    >
                        Offline Submissions
                    </SidebarItemNext>}
                </SidebarSubMenuNext>

                <SidebarSubMenuNext
                    title="Team"
                    itemKey="team"
                    prefix={<Icons.Staff />}
                    as="div"
                >
                    <SidebarItemNext
                        itemKey="team-internal-mail"
                        minimizedTooltipContent="Internal Mail"
                        onClick={() => props.onInternalMailClicked?.()}
                    >
                        Internal Mail
                    </SidebarItemNext>
                    <SidebarItemNext
                        itemKey="team-workforce"
                        minimizedTooltipContent="Workforce"
                        onClick={() => props.onItemClick?.(StateId.Workforce)}
                    >
                        Workforce
                    </SidebarItemNext>
                </SidebarSubMenuNext>

                {props.permissions.includes('my-tickets-view-reports') && (
                    <SidebarItemNext
                        itemKey="reports"
                        minimizedTooltipContent="Reports"
                        prefix={<Icons.LineChart />}
                        onClick={() => props.onItemClick?.(StateId.Reports)}
                    >
                        Reports
                    </SidebarItemNext>
                )}

                <SidebarSubMenuNext
                    title="Settings"
                    itemKey="settings"
                    prefix={<Icons.Settings />}
                    onClick={() => props.onItemClick?.(StateId.ManageTeams)}
                    as="div"
                >
                    <SidebarItemNext
                        itemKey="settings-teams"
                        onClick={() => props.onItemClick?.(StateId.ManageTeams)}
                    >
                        Manage Teams
                    </SidebarItemNext>
                    <SidebarItemNext
                        itemKey="settings-agents"
                        onClick={() => props.onItemClick?.(StateId.ManageAgents)}
                    >
                        Manage Agents
                    </SidebarItemNext>
                    <SidebarItemNext
                        itemKey="settings-roles"
                        onClick={() => props.onItemClick?.(StateId.ManageRoles)}
                    >
                        Roles &amp; Permissions
                    </SidebarItemNext>
                    <SidebarSubMenuNext
                        title="Site Components"
                        itemKey="settings-site-components"
                        onClick={() => props.onItemClick?.(StateId.MemberTicketsDesign)}
                        as="div"
                    >
                        <SidebarItemNext
                            itemKey="settings-site-components-member-tickets"
                            onClick={() => props.onItemClick?.(StateId.MemberTicketsDesign)}
                        >
                            Member Tickets Design
                        </SidebarItemNext>
                        <SidebarItemNext
                            itemKey="settings-site-components-chat"
                            onClick={() => props.onItemClick?.(StateId.ChatWidgetConfig)}
                        >
                            Chat Settings
                        </SidebarItemNext>
                        <SidebarItemNext
                            itemKey="settings-site-components-chat-widget"
                            onClick={() => props.onItemClick?.(StateId.ChatComponentEmbedScriptConfig)}
                        >
                            Chat Widget Design
                        </SidebarItemNext>
                    </SidebarSubMenuNext>
                    <SidebarItemNext
                        itemKey="settings-sla"
                        onClick={() => props.onItemClick?.(StateId.SlaSettings)}
                    >
                        SLA Settings
                    </SidebarItemNext>
                </SidebarSubMenuNext>


                <SidebarItemNext
                    itemKey="help"
                    title="Help & Support"
                    prefix={<Icons.HelpCircle />}
                    onClick={() => props.onItemClick?.(StateId.GetSupport)}
                >
                    Help & Support
                </SidebarItemNext>


            </SidebarNext>
        </Box >
    );
};

export default Sidebar;

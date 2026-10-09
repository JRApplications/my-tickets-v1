import { Popover, Box, TableListItem, Text, CloseButton, SidePanel } from '@wix/design-system';

interface NotificationsProps {
    isOpen: boolean;
    onClose: () => void;
    triggerElement: React.ReactNode;
    onNotificationRemove?: (id: string) => void;
    notifications?: { id: string; title: string; subtitle: string }[];
    isLoading?: boolean;
    isError?: boolean;
}

const NotificationItem = ({ id, title, subtitle, onClose }: { id: string; title: string; subtitle: string; onClose: (id: string) => void }) => {
    return (
        <TableListItem
            onClick={() => { }}
            className="notification-item"
            borderRadius="none"
            showDivider
            options={[
                {
                    value: (
                        <Box direction="vertical">
                            <Text weight="normal">{title}</Text>
                            <Text size="small" secondary>
                                {subtitle}
                            </Text>
                        </Box>
                    ),
                    width: 'auto',
                },
                {
                    value: (
                        <CloseButton skin="dark" size="medium" onClick={() => onClose(id)} />
                    ),
                    width: 'auto',
                    align: 'right',
                },
            ]}
        />
    )
}

const NotificationsList = ({ notifications = [], onNotificationRemove, isLoading, isError }: { notifications?: { id: string; title: string; subtitle: string }[]; onNotificationRemove?: (id: string) => void; isLoading?: boolean; isError?: boolean }) => {
    const handleRemove = onNotificationRemove || ((id: string) => { console.error('Notification remove handler not provided for id:', id); });
    return (
        <Box width='100%' direction='vertical' height='100%'>
            {isLoading && !isError && (
                <Box width='100%' height='100%' verticalAlign='middle' align='center'>
                    <Text size="small" secondary>
                        Loading notifications...
                    </Text>
                </Box>
            )}
            {!isLoading && isError && (
                <Box width='100%' height='100%' verticalAlign='middle' align='center'>
                    <Text size="small" secondary>
                        Error loading notifications
                    </Text>
                </Box>
            )}
            {!isLoading && !isError && notifications.length > 0 && (
                <Box width='100%' direction='vertical'>
                    {notifications.map((notification) => (
                        <NotificationItem
                            key={notification.id}
                            id={notification.id}
                            title={notification.title}
                            subtitle={notification.subtitle}
                            onClose={handleRemove}
                        />
                    ))}
                </Box>
            )}
            {!isLoading && !isError && notifications.length === 0 && (
                <Box width='100%' height='100%' verticalAlign='middle' align='center'>
                    <Text size="small" secondary>
                        No notifications
                    </Text>
                </Box>
            )}
        </Box>
    );
};

const Notifications = (props: NotificationsProps) => {
    return (
        <Popover showArrow shown={props.isOpen} appendTo="window"
            placement="right">
            <Popover.Element>
                {props.triggerElement}
            </Popover.Element>
            <Popover.Content>
                <SidePanel closeButtonProps={{ onClick: props.onClose }} height={'500px'} maxHeight={'500px'}>
                    <SidePanel.Header title="Notifications" />
                    <SidePanel.Content noPadding>
                        <Box width='100%' direction='vertical' height='100%'>
                            <NotificationsList
                                // filter notifications that has the same id as another notification
                                notifications={props.notifications}
                                onNotificationRemove={props.onNotificationRemove}
                                isLoading={props.isLoading}
                                isError={props.isError}
                            />
                        </Box>
                    </SidePanel.Content>
                </SidePanel>
            </Popover.Content>
        </Popover>
    );
}

export default Notifications;
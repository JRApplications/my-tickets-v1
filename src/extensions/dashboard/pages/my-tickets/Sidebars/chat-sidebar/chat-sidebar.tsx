import { Box, Text, Badge, Loader, TableListItem, Card, CounterBadge, Divider, SkeletonLine, SkeletonRectangle } from '@wix/design-system';
import { type TicketStatus, formatStatus, getStatusSkin } from '@jrapps/my_tickets_common_types';
import { forwardRef, useImperativeHandle } from 'react';
import { useChatSidebar } from './useChatSidebar';


const ChatSidebar = forwardRef<{ updateChat: (chatId: string, updates: { status?: string }) => void }, { permissions: string[]; teamId: string; onClick: (chatId: string) => void; onChatUpdate?: (chatId: string, updates: { status?: string }) => void }>(({ permissions, teamId, onClick }, ref) => {

    const { chats, isLoading, isError, updateChat, connectionStatus } = useChatSidebar(teamId);

    useImperativeHandle(ref, () => ({
        updateChat
    }), [updateChat]);

    const ChatItem = ({
        siteUserName,
        siteUserType,
        status,
        _id,
        onClick
    }: {
        siteUserName: string,
        siteUserType: string,
        status: string,
        onClick: (chatId: string) => void,
        _id: string
    }) => {
        return (
            <TableListItem
                onClick={() => onClick(_id)}
                borderRadius='none'
                showDivider
                options={[
                    {
                        value: (
                            <Box direction="vertical" maxWidth={'100%'} minWidth={'100%'}>
                                <Text size='medium' weight='bold'>{siteUserName}</Text>
                                <Box>
                                    <Badge skin="neutral" size='tiny' uppercase>{siteUserType}</Badge>
                                </Box>
                            </Box>
                        ),
                    },
                    {
                        value: (
                            <Badge skin={getStatusSkin(status as TicketStatus)} size='tiny'>{formatStatus(status as TicketStatus)}</Badge>
                        ),
                        width: 'auto',
                    },
                ]}
            />
        )
    }

    const hasPermission = permissions && permissions.includes('my-tickets-view-chats');

    return (
        <Box width="350px" height="100%" boxSizing="border-box">
            <Card className="tickets-sidebar-card" stretchVertically>
                <Card.Content size='none' dataHook='tickets-sidebar-card-content'>
                    {hasPermission && (
                        <Box direction='vertical'>
                            <Box padding="10px" verticalAlign="middle" gap={2} align="center">
                                <Text size='medium'>Live connection</Text>
                                <CounterBadge
                                    size='medium'
                                    skin={connectionStatus === 'connected' ? 'success' : connectionStatus === 'disconnected' ? 'danger' : 'warning'}
                                >
                                    {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'disconnected' ? 'Disconnected' : 'Unknown'}
                                </CounterBadge>
                            </Box>
                            <Divider />
                        </Box>
                    )}

                    <Box
                        width="100%"
                        flex="1"
                        minHeight={0}
                        flexGrow={1}
                        maxHeight="100%"
                        direction="vertical"
                        overflowY="auto"
                    >
                        {!hasPermission && (
                            <Box width='100%' height='100%' verticalAlign="middle" align="center" padding={4} boxSizing='border-box' gap={8}>
                                <Loader status="error" text='You do not have the necessary permissions to view live chats' />
                            </Box>
                        )}
                        {isLoading && hasPermission && (
                            <Box width='100%' height='100%' direction="vertical" padding={4} boxSizing='border-box' gap={8}>
                                {/* create 5 sceletons */}
                                {[...Array(5)].map((_, index) => (
                                    <Box key={index} direction='horizontal' width='100%' gap={2} boxSizing='border-box'>
                                        <Box direction='vertical' gap={2} width='100%'>
                                            <SkeletonLine width='50px' />
                                            <SkeletonRectangle width='100px' height='15px' />
                                        </Box>
                                        <Box height='100%' verticalAlign="middle" width='100%' align="right">
                                            <SkeletonRectangle width='100px' height='15px' />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}

                        {isError && hasPermission && (
                            <Box width='100%' height='100%' verticalAlign="middle" align="center">
                                <Loader size="small" status="error" text='Failed to load chats' />
                            </Box>
                        )}

                        {!isLoading && !isError && hasPermission && chats.length === 0 && (
                            <Box width="100%" height="100%" align="center" verticalAlign="middle">
                                <Text size="small">No chats available</Text>
                            </Box>
                        )}
                        {chats && !isLoading && !isError && chats && hasPermission &&
                            chats.map(({ siteUserName, siteUserType, status, _id }) => (
                                <ChatItem
                                    key={_id}
                                    siteUserName={siteUserName}
                                    siteUserType={siteUserType}
                                    status={status}
                                    onClick={onClick}
                                    _id={_id}
                                />
                            ))}
                    </Box>
                </Card.Content>
            </Card>
        </Box>
    );
});

ChatSidebar.displayName = "ChatSidebar";

export default ChatSidebar;

import { type FC, useEffect, useState } from 'react';
import { Box, Text, Badge, Avatar, Card, Button, Tooltip, CounterBadge, SkeletonCircle, SkeletonLine, SkeletonRectangle, Loader } from '@wix/design-system';

import ActionsButtonWrapper from './actions-button.wrapper';
import type { ChatHeaderProps } from './chats.types';

const ChatHeader: FC<ChatHeaderProps> = ({
    isLoading,
    onJoinChat,
    isJoining,
    isLeaving,
    isEnding,
    memberName,
    memberId,
    onViewMember,
    joinedChat,
    connectionStatus,
    onLeaveChat,
    onEndChat,
    chatEnded,
    userType,
    onConvertToTicket,
    onTransferChat,
}) => {
    // Tracks whether the agent has left the chat after having joined it.
    const [hasLeftChat, setHasLeftChat] = useState(false);

    // If the chat becomes "joined" again (e.g. re-joined), reset the left state.
    useEffect(() => {
        if (joinedChat) {
            setHasLeftChat(false);
        }
    }, [joinedChat]);

    const handleLeaveChat = async () => {
        if (await onLeaveChat()) {
            setHasLeftChat(true);
        }
    };

    const getButtonConfig = () => {
        if (joinedChat) {
            return {
                label: isLeaving ? 'Leaving…' : 'Leave Chat',
                onClick: handleLeaveChat,
                skin: 'destructive' as const,
                priority: 'secondary' as const,
            };
        }

        if (hasLeftChat) {
            return {
                label: isEnding ? 'Ending…' : 'End Chat',
                onClick: onEndChat,
                skin: 'destructive' as const,
                priority: 'primary' as const,
            };
        }

        return {
            label: isJoining ? 'Joining…' : 'Join Chat',
            onClick: onJoinChat,
            skin: 'primary' as const,
            priority: 'primary' as const,
        };
    };

    const { label, onClick, skin, priority } = getButtonConfig();

    return (
        <Box width='100%' boxSizing='border-box' direction='vertical' gap={'10px'} padding={'10px'}>
            <Card>
                <Card.Content>
                    <Box direction='vertical' gap={4}>
                        <Box WebkitJustifyContent="space-between" width="100%" verticalAlign='middle'>
                            <Box direction='horizontal' gap={2} verticalAlign='middle'>
                                {!isLoading && (
                                    <>
                                        <Avatar name={memberName || ''} />
                                        <Box direction='vertical' gap={2} verticalAlign='middle'>
                                            <Box gap={2} verticalAlign='middle'>
                                                <Text size="tiny" className='view-ticket-header-title'>{memberName}</Text>
                                                <Tooltip size='medium' content={`Connection status: ${connectionStatus === 'error' ? 'Disconnected' : connectionStatus === 'success' ? 'Connected' : 'Failed to get status'}`}>
                                                    <CounterBadge size='tiny' skin={connectionStatus === 'error' ? 'danger' : connectionStatus === 'success' ? 'success' : 'standard'} />
                                                </Tooltip>
                                            </Box>
                                            <Box direction={'horizontal'} gap={2} verticalAlign='middle'>
                                                <Badge size="medium" skin={'success'} uppercase>{userType === 'member' ? 'Member' : 'Visitor'}</Badge>
                                            </Box>
                                        </Box>
                                    </>
                                )}
                                {isLoading && (
                                    <>
                                        <SkeletonCircle diameter="48px" />
                                        <Box direction='vertical' gap={2} verticalAlign='middle'>
                                            <Box gap={2} verticalAlign='middle'>
                                                <SkeletonLine width="150px" />
                                                <SkeletonLine width="10px" />
                                            </Box>
                                            <Box direction={'horizontal'} gap={2} verticalAlign='middle'>
                                                <SkeletonLine width="100px" />
                                            </Box>
                                        </Box>
                                    </>
                                )}
                            </Box>
                            <Box>
                                <Box gap={3}>
                                    {!isLoading && (
                                        <ActionsButtonWrapper
                                            memberId={memberId}
                                            onViewMemberClicked={onViewMember}
                                            joinedChat={joinedChat}
                                            userType={userType}
                                            onConvertToTicket={onConvertToTicket}
                                            onTransferChat={onTransferChat}
                                        />
                                    )}
                                    {!chatEnded && !isLoading && (
                                        <Button onClick={onClick} skin={skin} priority={priority} disabled={isJoining || isLeaving || isEnding}>
                                            {isJoining || isLeaving || isEnding ? <><Loader size="tiny" /> {label}</> : label}
                                        </Button>
                                    )}
                                    {isLoading && (
                                        <>
                                            <SkeletonRectangle width="100px" height="30px" />
                                            <SkeletonRectangle width="100px" height="30px" />
                                        </>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Card.Content>
            </Card>
        </Box >
    );
};

export default ChatHeader;

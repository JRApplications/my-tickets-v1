import type { FC } from 'react';
import { Box, Text, Badge, Tabs, Avatar, TextButton, Card, SkeletonRectangle, SkeletonLine, SkeletonCircle } from '@wix/design-system';
import type { TicketStatus, TicketPriority } from '@jrapps/my_tickets_common_types';

import ActionsButtonWrapper from './actions-button.wrapper';
import SlaBadge from '../../common-components/sla-badge/sla-badge';
import type { TicketHeaderProps } from './tickets.types';
import {
    formatStatus, 
    getStatusSkin,
    formatPriority, 
    getPrioritySkin
} from '@jrapps/my_tickets_common_types';

const TicketHeader: FC<TicketHeaderProps> = ({
    memberName,
    memberId,
    ticketStatus,
    ticketPriority,
    subject,
    conversationState,
    ticketPermissions,
    onStatusChange,
    onPriorityChange,
    onTransferTicket,
    onMergeTicket,
    onViewMember,
    onAssignToMeClicked,
    onConversationStateChanged,
    onStateChange,
    onOpenTicketSidebar,
    ticketId,
    agentId,
    isFollowingTicket,
    isAssignedToTicket,
    isLoading,
    sla
}) => {

    const canManageInternalNotes = ticketPermissions?.includes('my-tickets-manage-internal-notes');

    return (
        // <Box className='view-ticket-header'>
        <Box width='100%' boxSizing='border-box' direction='vertical' gap={'10px'} padding={'10px'}>
            <Card>
                <Card.Content>
                    <Box direction='vertical' gap={4}>
                        <Box WebkitJustifyContent="space-between" width="100%" verticalAlign='middle'>
                            <Box direction='horizontal' gap={2} verticalAlign='middle'>
                                {!isLoading && <Avatar name={memberName || 'Guest'} />}
                                {isLoading && <SkeletonCircle diameter='50px' />}
                                <Box direction='vertical' gap={2} verticalAlign='middle'>

                                    {!isLoading && <Text size="tiny" className='view-ticket-header-title'>{memberName || 'Error getting member name'}</Text>}
                                    {isLoading && <SkeletonLine width='100px' />}
                                    <Box direction={'horizontal'} gap={2} verticalAlign='middle'>
                                        {!isLoading && (
                                            <>
                                                <Text size="tiny" className='view-ticket-header-subtitle'>{`${subject}`}</Text>
                                                <Badge size="small" skin={getStatusSkin(ticketStatus as TicketStatus)}>{formatStatus(ticketStatus as TicketStatus)}</Badge>
                                                <Badge size="small" skin={getPrioritySkin(ticketPriority as TicketPriority)}>{formatPriority(ticketPriority as TicketPriority)}</Badge>
                                                <SlaBadge sla={sla} />
                                            </>
                                        )}

                                        {isLoading && (
                                            <>
                                                <SkeletonLine width='50px' />
                                                <SkeletonRectangle width='90px' height='25px' />
                                                <SkeletonRectangle width='90px' height='25px' />
                                            </>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                            <Box>
                                {isLoading && <SkeletonRectangle width='120px' height='30px' />}
                                {!isLoading &&
                                    <ActionsButtonWrapper
                                        ticketStatus={ticketStatus}
                                        permissions={ticketPermissions}
                                        memberId={memberId}
                                        onChangePriorityButtonClicked={onPriorityChange}
                                        onTicketStatusChangeButtonClicked={onStatusChange}
                                        onTransferButtonClicked={onTransferTicket}
                                        onMergeTicketClicked={onMergeTicket}
                                        onViewMemberClicked={onViewMember}
                                        onAssignToMeClicked={onAssignToMeClicked}
                                        ticketId={ticketId}
                                        agentId={agentId}
                                        isFollowingTicket={isFollowingTicket}
                                        isAssignedToTicket={isAssignedToTicket}
                                    />
                                }
                            </Box>
                        </Box>


                        <Box verticalAlign='middle' WebkitJustifyContent='space-between' width='100%'>
                            {isLoading && (
                                <Box gap={2} align='left'>
                                    <SkeletonRectangle width='80px' height='20px' />
                                    <SkeletonRectangle width='80px' height='20px' />
                                    <SkeletonRectangle width='80px' height='20px' />
                                </Box>
                            )}
                            {!isLoading && (
                                <Tabs
                                    alignment="center"
                                    size="small"
                                    horizontalPadding={false}
                                    activeId={conversationState}
                                    showDivider={false}
                                    onClick={(value) => {
                                        if (onConversationStateChanged) {
                                            onConversationStateChanged(Number(value.id));
                                        }

                                        if (onStateChange) {
                                            if (value.id === 1 || value.id === 2) {
                                                onStateChange(1);
                                            } else if (value.id === 3) {
                                                onStateChange(2);
                                            }
                                        }
                                    }}
                                    items={[
                                        { id: 1, title: 'Conversation' },
                                        ...(canManageInternalNotes ? [{ id: 2, title: 'Internal Notes' }] : []),
                                        { id: 3, title: 'Timeline' }
                                    ]}
                                />
                            )}
                            {isLoading && <SkeletonRectangle width='150px' height='20px' />}
                            {!isLoading && <TextButton onClick={onOpenTicketSidebar}>View More Details</TextButton>}
                        </Box>
                    </Box>
                </Card.Content>
            </Card>
        </Box >
    );
};

export default TicketHeader;

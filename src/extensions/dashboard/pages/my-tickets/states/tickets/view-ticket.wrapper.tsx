import { useState, useEffect, type FC } from 'react';
import {
    Box,
    Card,
    Text,
    Timeline,
    SkeletonRectangle,
    SectionHelper,
} from '@wix/design-system';

import MessageWrapper from '../../common-components/message-wrapper/message.wrapper';
import TicketHeader from './ticket-header';
import './view-ticket.css';
import ViewTicketSidebar from './view-ticket-sidebar/view-ticket-sidebar.route';
import MessageInput from '../../common-components/message-input/message-input.route';
import { LoadingState } from '@jrapps/my_tickets_dashboard_ui';
import { PermissionDeniedState } from '@jrapps/my_tickets_dashboard_ui';
import TicketTabs from './ticket-tabs/ticket-tabs.route';

import type { ViewTicketWrapperProps } from './tickets.types';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';

const ViewTicketWrapper: FC<ViewTicketWrapperProps> = ({
    ticketTimeline,
    memberDetails,
    messages,
    onSendMessage,
    ticketId,
    agentId,
    teamId,
    ticketPermissions,
    status,
    priority,
    isLoading,
    isError,
    onConversationStateChanged,
    conversationState,
    subject,
    onViewMemberClicked,
    onAssignToMeClicked,
    assignedTeam,
    assignedAgent,
    agentsFollowing,
    teamsFollowing,
    createdDate,
    updatedDate,
    ticketNumber,
    onTabChange,
    onTicketStatusChangeButtonClicked,
    onChangePriorityButtonClicked,
    onTransferTicketButtonClicked,
    onMergeTicketClicked,
    isFollowingTicket,
    isAssignedToTicket,
    tags,
    onTagsChange,
    onTicketAction,
    isSpam = false,
    isDeleted = false,
    mergeSummary,
    relatedTickets,
    viewTicketStateOverride,
    onPreviousTicket,
    onNextTicket,
    sla,
    viewers = [],
    reply,
    onTyping,
    onRefreshAfterReply,
    onDismissReply
}) => {
    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [hasFailedSend, setHasFailedSend] = useState(false);
    const [ticketStatus, setTicketStatus] = useState('');
    const [ticketPriority, setTicketPriority] = useState('');
    const [attachments, setAttachments] = useState<Array<{
        id: string;
        name: string;
        url: string;
    }>>([]);
    const [state, setState] = useState<number>(1);
    const [isTicketSidebarOpen, setIsTicketSidebarOpen] = useState(false);
    const handleSendMessage = async () => {
        const hasText = messageInput.trim().length > 0;
        const hasAttachments = attachments.length > 0;
        if ((!hasText && !hasAttachments) || isSending || !onSendMessage) return;
        if (!conversationState) {
            ShowToast({ message: 'Conversation state is undefined', type: 'error' });
            return;
        }

        setIsSending(true);
        try {
            const sent = await onSendMessage(
                messageInput,
                attachments,
                conversationState,
                hasText ? 'TEXT' : 'ATTACHMENT'
            );
            setHasFailedSend(!sent);
            if (sent) {
                setMessageInput('');
                setAttachments([]);
            }
        } catch (error) {
            console.error('MessageInput error:', error);
            setHasFailedSend(true);
            ShowToast({ message: 'Failed to send message. Please try again.', type: 'error' });
        } finally {
            setIsSending(false);
        }
    };

    const handleMessageInputChange = (value: string) => {
        setMessageInput(value);
        setHasFailedSend(false);
        onTyping?.(conversationState === 1 && value.trim().length > 0);
    };

    const handleAttachmentsChange: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; url: string }>>> = (value) => {
        setAttachments(value);
        setHasFailedSend(false);
    };

    const handleOpenTicketSidebar = () => {
        setIsTicketSidebarOpen(true);
    };

    const handleCloseTicketSidebar = () => {
        setIsTicketSidebarOpen(false);
    };

    const replyingViewers = viewers.filter((viewer) => viewer.typing);
    const joinNames = (names: string[]) => names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    const presenceMessage = replyingViewers.length > 0
        ? `${joinNames(replyingViewers.map((viewer) => viewer.name))} ${replyingViewers.length === 1 ? 'is' : 'are'} replying to this ticket right now.`
        : `${joinNames(viewers.map((viewer) => viewer.name))} ${viewers.length === 1 ? 'is' : 'are'} also viewing this ticket.`;

    useEffect(() => {
        setTicketStatus(status);
        setTicketPriority(priority);
    }, [status, priority]);

    useEffect(() => {
        setMessageInput('');
        setAttachments([]);
        setHasFailedSend(false);
    }, [ticketId]);

    if (!ticketPermissions.includes('my-tickets-view-single-ticket')) {
        return (
            <PermissionDeniedState />
        );
    }

    if (!ticketId || !teamId || !agentId) {
        return (
            <Box direction="vertical" width='100%'>
                {!viewTicketStateOverride && <TicketTabs />}
                <Box className='view-ticket-empty-state'>
                    <Text className='text'>Select a ticket to view and start assisting</Text>
                </Box>
            </Box>
        );
    }

    if (isError) {
        return (
            <Box direction={'vertical'} height={'100%'} width={'100%'}>
                {!viewTicketStateOverride && <TicketTabs currentTicketId={ticketId} currentTicketDisplayId={ticketNumber} />}
                <LoadingState
                    state={'error'}
                    errorText='Failed to load ticket. Please try again later.'
                />
            </Box>
        );
    }

    return (
        <Box direction="vertical" width='100%'>
            {isTicketSidebarOpen && (
                <Box className='view-ticket-sidebar'>
                    <ViewTicketSidebar
                        status={ticketStatus}
                        priority={ticketPriority}
                        assignedTeam={assignedTeam}
                        assignedAgent={assignedAgent}
                        agentsFollowing={agentsFollowing}
                        teamsFollowing={teamsFollowing}
                        ticketId={ticketId}
                        ticketNumber={ticketNumber}
                        createdDate={createdDate}
                        updatedDate={updatedDate}
                        onCloseTicketSidebar={handleCloseTicketSidebar}
                        tags={tags}
                        onTagsChange={ticketPermissions.includes('my-tickets-manage-ticket-tags') ? onTagsChange : undefined}
                        onTicketAction={ticketPermissions.includes('my-tickets-manage-ticket-disposition') ? onTicketAction : undefined}
                        isSpam={isSpam}
                        isDeleted={isDeleted}
                        mergeSummary={mergeSummary}
                        relatedTickets={relatedTickets}
                        permissions={ticketPermissions}
                    />
                </Box>
            )}
            {!viewTicketStateOverride && <TicketTabs onSelect={onTabChange} currentTicketId={ticketId} currentTicketDisplayId={ticketNumber} onPreviousTicket={onPreviousTicket} onNextTicket={onNextTicket} />}
            <TicketHeader
                memberName={memberDetails?.memberName || ''}
                memberId={memberDetails?.memberId || ''}
                ticketStatus={ticketStatus}
                ticketPriority={ticketPriority}
                subject={subject}
                conversationState={conversationState}
                ticketPermissions={ticketPermissions}
                onStatusChange={() => onTicketStatusChangeButtonClicked(ticketId || '')}
                onPriorityChange={() => onChangePriorityButtonClicked(ticketId || '')}
                onTransferTicket={() => onTransferTicketButtonClicked(ticketId || '')}
                onMergeTicket={() => onMergeTicketClicked && onMergeTicketClicked(ticketId || '')}
                onViewMember={() => onViewMemberClicked && onViewMemberClicked(memberDetails?.memberId || '')}
                onAssignToMeClicked={() => onAssignToMeClicked && onAssignToMeClicked({ type: isAssignedToTicket ? 'unassign' : 'assign' })}
                onConversationStateChanged={onConversationStateChanged}
                onStateChange={(state: number) => setState(state)}
                state={state}
                onOpenTicketSidebar={handleOpenTicketSidebar}
                ticketId={ticketId}
                agentId={agentId}
                isFollowingTicket={isFollowingTicket}
                isAssignedToTicket={isAssignedToTicket}
                isLoading={isLoading}
                sla={sla}
            />
            <Box direction='horizontal' className='view-ticket-outer-body-container'>
                <Box direction='vertical' className='inner-box-one'>
                    {state === 1 && (
                        <Card className='view-ticket-card' stretchVertically hideOverflow>
                            <Card.Content dataHook="view-ticket-card-content">
                                <Box className='view-ticket-body'>
                                    {!isLoading && (
                                        <Box className='view-ticket-inner-body-container'>
                                            <MessageWrapper messages={messages} internalNoteMode={conversationState === 2} agentId={agentId} />
                                        </Box>
                                    )}
                                    {isLoading && (
                                        <Box className='view-ticket-inner-body-container' gap='18px' direction='vertical'>
                                            <Box align='left'>
                                                <SkeletonRectangle width="450px" height="35px" />
                                            </Box>
                                            <Box align='right'>
                                                <SkeletonRectangle width="300px" height="35px" />
                                            </Box>
                                            <Box align='left'>
                                                <SkeletonRectangle width="500px" height="35px" />
                                            </Box>
                                            <Box align='right'>
                                                <SkeletonRectangle width="450px" height="35px" />
                                            </Box>
                                            <Box align='left'>
                                                <SkeletonRectangle width="400px" height="35px" />
                                            </Box>
                                            <Box align='right'>
                                                <SkeletonRectangle width="350px" height="35px" />
                                            </Box>
                                            <Box align='left'>
                                                <SkeletonRectangle width="300px" height="35px" />
                                            </Box>
                                            <Box align='right'>
                                                <SkeletonRectangle width="250px" height="35px" />
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            </Card.Content>
                            <Box className='view-ticket-footer'>
                                <Box className='view-ticket-inner-footer-container' padding='18px' paddingTop='0px' direction='vertical' gap='12px'>
                                    {reply && (
                                        <SectionHelper skin='warning' fullWidth actionText='Refresh' onAction={onRefreshAfterReply} onClose={onDismissReply}>
                                            <Text size='small'>{reply.agentName} sent a reply while you were viewing this ticket. Refresh to see it before you respond.</Text>
                                        </SectionHelper>
                                    )}
                                    {!reply && viewers.length > 0 && (
                                        <SectionHelper skin={replyingViewers.length > 0 ? 'warning' : 'standard'} fullWidth>
                                            <Text size='small'>{presenceMessage}</Text>
                                        </SectionHelper>
                                    )}
                                    <MessageInput
                                        messageInput={messageInput}
                                        setMessageInput={handleMessageInputChange}
                                        handleSendMessage={handleSendMessage}
                                        isSending={isSending}
                                        hasFailedSend={hasFailedSend}
                                        ticketPermissions={ticketPermissions}
                                        attachments={attachments}
                                        setAttachments={handleAttachmentsChange}
                                        placeholder={conversationState === 2 ? 'Start typing your message... Type @ to mention someone' : 'Start typing your message...'}
                                        allowMentions={conversationState === 2}
                                        getMentionApiUrl="/api/agents/getMentionList"
                                        isLoading={isLoading}
                                    />
                                </Box>
                            </Box>
                        </Card>
                    )}
                    {state === 2 && (
                        <Box className='view-ticket-body'>
                            <Box className='view-ticket-inner-body-container'>
                                <Card stretchVertically hideOverflow>
                                    <Card.Content dataHook="view-ticket-card-content">
                                        <Timeline items={ticketTimeline} className='view-ticket-timeline' />
                                    </Card.Content>
                                </Card>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    )
}

export default ViewTicketWrapper;

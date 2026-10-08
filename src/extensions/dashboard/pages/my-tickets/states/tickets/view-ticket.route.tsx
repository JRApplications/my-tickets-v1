import { useCallback, useEffect, useState, type FC } from 'react';
import ViewTicketWrapper from './view-ticket.wrapper';
import { fetchTicketDetails, fetchAgentName, sendTicketMessage, sendInternalNote, fetchTicketTimeline, updateTicketTags, updateTicketDisposition } from './view-ticket';

import type { ViewTicketProps } from './tickets.types';
import type { TicketSla } from '@jrapps/my_tickets_common_types';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import { useTicketPresence } from './useTicketPresence';

const enum ConversationTab {
    MESSAGES = 1,
    INTERNAL_NOTES = 2,
}

const ViewTicket: FC<ViewTicketProps> = ({ ticketId, ticketDisplayId, agentId, teamId, permissions, onTicketStatusChangeButtonClicked, onChangePriorityButtonClicked, onTransferTicketButtonClicked, onMergeTicketClicked, onViewMemberClicked, onAssignToMeClicked, updatedPriority, updatedStatus, viewTicketStateOverride, onTicketTabChange, onPreviousTicket, onNextTicket, onTicketDispositionChange, assignmentUpdate }) => {
    const [memberDetails, setMemberDetails] = useState<{ memberName: string, memberId: string } | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [status, setStatus] = useState<string>('');
    const [priority, setPriority] = useState<string>('');
    const [agentName, setAgentName] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isError, setIsError] = useState<boolean>(false);
    const [conversationState, setConversationState] = useState<number>(ConversationTab.MESSAGES);
    const [internalNotes, setInternalNotes] = useState<any[]>([]);
    const [ticketSubject, setTicketSubject] = useState<string>('');
    const [ticketCreatedDate, setTicketCreatedDate] = useState<string>('');
    const [ticketUpdatedDate, setTicketUpdatedDate] = useState<string>('');
    const [primaryTicketNumber, setPrimaryTicketNumber] = useState<string>('');
    const [viewTicketId, setViewTicketId] = useState<string>(ticketId || '');
    const [ticketTimeline, setTicketTimeline] = useState<any[]>([]);
    const [isFollowingTicket, setIsFollowingTicket] = useState<boolean>(false);
    const [isAssignedToTicket, setIsAssignedToTicket] = useState<boolean>(false);

    const [agentsFollowing, setAgentsFollowing] = useState<{ id: string, name: string }[]>([]);
    const [teamsFollowing, setTeamsFollowing] = useState<{ id: string, name: string }[]>([]);

    const [assignedTeam, setAssignedTeam] = useState<{ id: string | undefined, name: string }>({ id: undefined, name: '' });
    const [assignedAgent, setAssignedAgent] = useState<{ id: string | undefined, name: string }>({ id: undefined, name: '' });
    const [ticketTags, setTicketTags] = useState<string[]>([]);
    const [ticketIsSpam, setTicketIsSpam] = useState(false);
    const [ticketIsDeleted, setTicketIsDeleted] = useState(false);
    const [mergeSummary, setMergeSummary] = useState<any>(null);
    const [relatedTickets, setRelatedTickets] = useState<string[]>([]);
    const [sla, setSla] = useState<TicketSla | undefined>(undefined);
    const [reloadToken, setReloadToken] = useState(0);
    const { viewers, reply, notifyTyping, notifyReplied, dismissReply } = useTicketPresence(viewTicketId, agentId);

    const handleRefreshAfterReply = useCallback(() => {
        dismissReply();
        setReloadToken((token) => token + 1);
    }, [dismissReply]);

    // SLA clocks are recomputed server-side after replies and status/priority changes.
    const refreshSla = useCallback(async (id: string) => {
        try {
            const ticket = await fetchTicketDetails(id);
            setSla(ticket?.sla);
        } catch {
            // The badge keeps its previous value; the next full load corrects it.
        }
    }, []);

    // Sync when the parent selects a new ticket from the sidebar
    useEffect(() => {
        if (ticketId !== viewTicketId) {
            setViewTicketId(ticketId || '');
            setIsLoading(Boolean(ticketId));
            setPrimaryTicketNumber('');
        }
    }, [ticketId, viewTicketId]);

    useEffect(() => {
        if (!assignmentUpdate || assignmentUpdate.ticketId !== viewTicketId) return;
        if ('assignedAgent' in assignmentUpdate) {
            setAssignedAgent({ id: assignmentUpdate.assignedAgent?.id, name: assignmentUpdate.assignedAgent?.name || '' });
        }
        if ('assignedTeam' in assignmentUpdate) {
            setAssignedTeam({ id: assignmentUpdate.assignedTeam?.id, name: assignmentUpdate.assignedTeam?.name || '' });
        }
    }, [assignmentUpdate, viewTicketId]);

    const handleSendMessage = useCallback(async (message: string, attachment: Array<{ id: string; name: string; url: string }>, state: number, messageType: string): Promise<boolean> => {
        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticMessage = {
            _id: optimisticId,
            ticketId: viewTicketId,
            timestamp: Date.now(),
            senderType: 'agent',
            senderId: agentId,
            senderName: agentName,
            attachment,
            message,
            sending: true,
        };

        try {
            if (state === ConversationTab.MESSAGES) {
                setMessages((current) => [...current, optimisticMessage]);
                const data = await sendTicketMessage({ ticketId: viewTicketId, message, attachment, agentId, agentName, messageType });
                if (data.success) {
                    setMessages(data.ticket.communication);
                    ShowToast({ message: 'Message sent successfully', type: 'success' });
                    void refreshSla(viewTicketId);
                    notifyReplied();
                    return true;
                }
                setMessages((current) => current.filter((item) => item._id !== optimisticId));
            } else if (state === ConversationTab.INTERNAL_NOTES) {
                setInternalNotes((current) => [...current, optimisticMessage]);
                const data = await sendInternalNote({ ticketId: viewTicketId, message, attachment, agentId, agentName, messageType });
                if (data.success) {
                    setInternalNotes(data.ticket.internalNotes);
                    ShowToast({ message: 'Internal note added successfully', type: 'success' });
                    return true;
                }
                setInternalNotes((current) => current.filter((item) => item._id !== optimisticId));
            }
        } catch (error) {
            setMessages((current) => current.filter((item) => item._id !== optimisticId));
            setInternalNotes((current) => current.filter((item) => item._id !== optimisticId));
            console.error('Error sending message: ', error);
            ShowToast({ message: 'Failed to send message. Please try again.', type: 'error' });
        }
        return false;
    }, [viewTicketId, agentId, agentName, notifyReplied]);

    const handleConversationStateChange = useCallback((state: number) => {
        setConversationState(state);
    }, []);

    const handleTagsChange = useCallback(async (nextTags: string[]) => {
        const previousTags = ticketTags;
        setTicketTags(nextTags);
        try {
            const savedTags = await updateTicketTags(viewTicketId, nextTags, agentId, agentName);
            setTicketTags(savedTags);
            ShowToast({ message: 'Ticket tags updated', type: 'success' });
        } catch (error) {
            setTicketTags(previousTags);
            ShowToast({ message: error instanceof Error ? error.message : 'Failed to update ticket tags', type: 'error' });
        }
    }, [ticketTags, viewTicketId, agentId, agentName]);

    const handleTicketAction = useCallback(async (action: 'spam' | 'delete' | 'restore') => {
        try {
            const disposition = await updateTicketDisposition(viewTicketId, action, agentId, agentName);
            setTicketIsSpam(disposition.isSpam);
            setTicketIsDeleted(disposition.isDeleted);
            onTicketDispositionChange(viewTicketId, disposition);
            ShowToast({ message: action === 'spam' ? 'Ticket moved to Spam' : action === 'delete' ? 'Ticket moved to Deleted' : 'Ticket restored', type: 'success' });
        } catch (error) {
            ShowToast({ message: error instanceof Error ? error.message : 'Failed to update ticket', type: 'error' });
            throw error;
        }
    }, [viewTicketId, agentId, agentName, onTicketDispositionChange]);

    // Update status and priority when modals provide updated values
    useEffect(() => {
        if (updatedStatus) {
            setStatus(updatedStatus);
        }
        if (updatedPriority) {
            setPriority(updatedPriority);
        }
        if ((updatedStatus || updatedPriority) && viewTicketId) {
            void refreshSla(viewTicketId);
        }
    }, [updatedStatus, updatedPriority]);

    useEffect(() => {
        let isCurrentRequest = true;

        const loadTicketData = async () => {
            try {
                setIsError(false);
                const [ticket, name, timeline] = await Promise.all([
                    fetchTicketDetails(viewTicketId),
                    fetchAgentName(agentId),
                    fetchTicketTimeline(viewTicketId)
                ]);

                if (!isCurrentRequest) return;

                setMemberDetails({ memberName: ticket.memberName, memberId: ticket.memberId });
                setMessages(ticket.communication || []);
                setStatus(ticket.status);
                setPriority(ticket.priority);
                setInternalNotes(ticket.internalNotes || []);
                setTicketSubject(ticket.subject || 'Error getting subject');



                setAssignedAgent(ticket?.assignedAgent || { id: '0000', name: 'No agent assigned' });
                setAssignedTeam(ticket?.assignedTeam || { id: '0000', name: 'No team assigned' });

                setTeamsFollowing(ticket.teamsFollowing || []);
                setAgentsFollowing(ticket.agentsFollowing || []);



                setTicketCreatedDate(ticket._createdDate || 'Error getting created date');
                setTicketUpdatedDate(ticket._updatedDate || 'Error getting updated date');
                setPrimaryTicketNumber(ticket.primaryTicketNumber || 'Error getting ticket number');
                setAgentName(name);
                setIsFollowingTicket(ticket.agentsFollowing?.some(agent => agent.id === agentId) || false);
                setIsAssignedToTicket(ticket.assignedAgent?.id === agentId);
                setTicketTags(ticket.tags || []);
                setTicketIsSpam(ticket.isSpam === true);
                setTicketIsDeleted(ticket.isDeleted === true);
                setTicketTimeline(timeline);
                setMergeSummary(ticket.mergeSummary || null);
                setRelatedTickets(ticket.relatedTickets || []);
                setSla(ticket.sla);
                setIsLoading(false);
                setIsError(false);
            } catch (error) {
                if (!isCurrentRequest) return;
                console.error("Error fetching data: ", error);
                setIsError(true);
                setIsLoading(false);
                ShowToast({ message: 'Failed to fetch ticket data. Please try again.', type: 'error' });
            }
        }

        if (viewTicketId && agentId) {
            loadTicketData();
        }

        return () => {
            isCurrentRequest = false;
        };
    }, [viewTicketId, agentId, reloadToken]);

    return <ViewTicketWrapper
        memberDetails={memberDetails ?? undefined}
        messages={conversationState === ConversationTab.MESSAGES ? messages : internalNotes}
        ticketTimeline={ticketTimeline}
        onSendMessage={handleSendMessage}
        ticketId={viewTicketId}
        ticketDisplayId={ticketDisplayId}
        agentId={agentId}
        teamId={teamId}
        ticketPermissions={permissions}
        status={status}
        priority={priority}
        isLoading={isLoading}
        isError={isError}
        conversationState={conversationState}
        onConversationStateChanged={handleConversationStateChange}
        subject={ticketSubject}
        onViewMemberClicked={onViewMemberClicked}
        onAssignToMeClicked={onAssignToMeClicked}
        isFollowingTicket={isFollowingTicket}
        createdDate={ticketCreatedDate}
        updatedDate={ticketUpdatedDate}
        ticketNumber={primaryTicketNumber ? `#${primaryTicketNumber}` : (viewTicketId === ticketId ? (ticketDisplayId || '') : '')}
        onTicketStatusChangeButtonClicked={onTicketStatusChangeButtonClicked}
        onChangePriorityButtonClicked={onChangePriorityButtonClicked}
        onTransferTicketButtonClicked={onTransferTicketButtonClicked}
        onMergeTicketClicked={onMergeTicketClicked}
        onTabChange={(tId: string | null) => {
            setPrimaryTicketNumber('');
            setIsLoading(Boolean(tId));
            setIsError(false);
            setViewTicketId(tId || '');
            onTicketTabChange?.(tId);
        }}
        assignedTeam={assignedTeam}
        assignedAgent={assignedAgent}
        agentsFollowing={agentsFollowing}
        teamsFollowing={teamsFollowing}
        isAssignedToTicket={isAssignedToTicket}
        tags={ticketTags}
        mergeSummary={mergeSummary}
        relatedTickets={relatedTickets}
        viewTicketStateOverride={viewTicketStateOverride}
        onPreviousTicket={onPreviousTicket}
        onNextTicket={onNextTicket}
        onTagsChange={handleTagsChange}
        onTicketAction={permissions.includes('my-tickets-manage-ticket-disposition') ? handleTicketAction : undefined}
        isSpam={ticketIsSpam}
        isDeleted={ticketIsDeleted}
        sla={sla}
        viewers={viewers}
        reply={reply}
        onTyping={notifyTyping}
        onRefreshAfterReply={handleRefreshAfterReply}
        onDismissReply={dismissReply}
    />
}

export default ViewTicket;

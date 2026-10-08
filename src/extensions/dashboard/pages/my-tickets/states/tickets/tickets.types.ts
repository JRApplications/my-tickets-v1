import type { TicketSla } from '@jrapps/my_tickets_common_types';
import type { TicketReply, TicketViewer } from './useTicketPresence';

export interface ViewTicketProps {
    ticketId: string | any;
    ticketDisplayId?: string;
    agentId: string;
    teamId: string;
    permissions: string[];
    onTicketStatusChangeButtonClicked: (ticketId: string) => void;
    onChangePriorityButtonClicked: (ticketId: string) => void;
    onTransferTicketButtonClicked: (ticketId: string) => void;
    onMergeTicketClicked?: (ticketId: string) => void;
    onViewMemberClicked: (memberId: string) => void;
    onAssignToMeClicked: (params: { type: 'assign' | 'unassign' }) => void;
    updatedPriority?: string | null;
    updatedStatus?: string | null;
    viewTicketStateOverride?: boolean;
    onTicketTabChange?: (ticketId: string | null) => void;
    onPreviousTicket?: () => void;
    onNextTicket?: () => void;
    onTicketDispositionChange: (ticketId: string, updates: { isSpam: boolean; isDeleted: boolean }) => void;
    assignmentUpdate?: { ticketId: string; assignedAgent?: { id?: string; name?: string }; assignedTeam?: { id?: string; name?: string } } | null;
}

export interface ViewTicketWrapperProps {
    ticketTimeline: any;
    memberDetails?: { memberName: string; memberId: string };
    messages: any[];
    onSendMessage?: (message: string, attachment: Array<{ id: string; name: string; url: string }>, state: number, messageType: string) => Promise<boolean>;
    ticketId?: string | null;
    ticketDisplayId?: string;
    agentId: string;
    teamId: string;
    relatedTickets: string[];
    status: string;
    priority: string;
    subject?: string;
    isLoading: boolean;
    isError?: boolean;
    onConversationStateChanged?: (state: number) => void;
    conversationState?: number;
    onViewMemberClicked?: (memberId: string) => void;
    onAssignToMeClicked?: (params: { type: 'assign' | 'unassign' }) => void;
    createdDate: string;
    updatedDate: string;
    ticketNumber: string;
    onTabChange?: (ticketId: string | null) => void;
    onTicketStatusChangeButtonClicked: (ticketId: string) => void;
    onChangePriorityButtonClicked: (ticketId: string) => void;
    onTransferTicketButtonClicked: (ticketId: string) => void;
    onMergeTicketClicked?: (ticketId: string) => void;
    isFollowingTicket: boolean;
    mergeSummary?: any;
    ticketPermissions: string[];
    assignedTeam: { id: string | undefined; name: string };
    assignedAgent: { id: string | undefined; name: string };
    agentsFollowing: Array<{ id: string; name: string }>;
    teamsFollowing: Array<{ id: string; name: string }>;
    isAssignedToTicket: boolean;
    tags: string[];
    onTagsChange?: (tags: string[]) => void;
    onTicketAction?: (action: 'spam' | 'delete' | 'restore') => Promise<void>;
    isSpam?: boolean;
    isDeleted?: boolean;
    viewTicketStateOverride?: boolean;
    onPreviousTicket?: () => void;
    onNextTicket?: () => void;
    sla?: TicketSla;
    viewers?: TicketViewer[];
    reply?: TicketReply | null;
    onTyping?: (isTyping: boolean) => void;
    onRefreshAfterReply?: () => void;
    onDismissReply?: () => void;
}

export interface TicketActionsButtonWrapperProps {
    ticketStatus: string;
    permissions: string[];
    memberId: string;
    onTicketStatusChangeButtonClicked?: () => void;
    onTransferButtonClicked?: () => void;
    onChangePriorityButtonClicked?: () => void;
    onMergeTicketClicked?: () => void;
    onViewMemberClicked?: (memberId: string) => void;
    onAssignToMeClicked?: (params: { type: 'assign' | 'unassign' }) => void;
    isFollowingTicket: boolean;
    ticketId: string;
    agentId: string;
    isAssignedToTicket: boolean;
}

export interface TicketMessagesWrapperProps {
    messages: any[];
}

export interface ViewTicketSidebarProps {
    status: string;
    priority: string;
    assignedTeam: { id: string | undefined; name: string };
    assignedAgent: { id: string | undefined; name: string };
    agentsFollowing: Array<{ id: string; name: string }>;
    teamsFollowing: Array<{ id: string; name: string }>;
    ticketId: string;
    ticketNumber: string;
    createdDate: string;
    updatedDate: string;
    onCloseTicketSidebar?: () => void;
    tags: string[];
    onTagsChange?: (tags: string[]) => void;
    onTicketAction?: (action: 'spam' | 'delete' | 'restore') => Promise<void>;
    isSpam?: boolean;
    isDeleted?: boolean;
    relatedTickets: string[];
    permissions: string[];
    mergeSummary?: any;
}

export interface ViewTicketSidebarWrapperProps {
    status: string;
    priority: string;
    assignedTeam: { id: string | undefined; name: string };
    assignedAgent: { id: string | undefined; name: string };
    agentsFollowing: Array<{ id: string; name: string }>;
    teamsFollowing: Array<{ id: string; name: string }>;
    ticketId: string;
    ticketNumber: string;
    createdDate: string;
    updatedDate: string;
    onCloseTicketSidebar?: () => void;
    tags: string[];
    onTagsChange?: (tags: string[]) => void;
    onTicketAction?: (action: 'spam' | 'delete' | 'restore') => Promise<void>;
    isSpam?: boolean;
    isDeleted?: boolean;
    relatedTickets: string[];
    mergeSummary?: any;
    permissions: string[];
}

export interface MessageInputProps {
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSendMessage: () => void;
    isSending: boolean;
    ticketPermissions: string[];
    attachments: Array<{ id: string; name: string; url: string }>;
    setAttachments: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; url: string }>>>;
}

export interface MessageInputWrapperProps {
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSendMessage: () => void;
    isSending: boolean;
    ticketPermissions: string[];
    attachments: Array<{ id: string; name: string; url: string }>;
    setAttachments: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; url: string }>>>;
}

export interface AttachmentProps {
    item: {
        id: string;
        name: string;
        url: string;
    };
}

export interface AttachmentListProps {
    items: Array<{
        id: string;
        name: string;
        url: string;
    }>;
}

export interface AttachmentWrapperProps {
    item: {
        id: string;
        name: string;
        url: string;
    };
}

export interface AttachmentListWrapperProps {
    items: Array<{
        id: string;
        name: string;
        url: string;
    }>;
    onRemove?: (id: string) => void;
    onClick?: (id: string, url: string) => void;
    onFilesSent?: (files: Array<{ id: string; name: string; url: string }>) => void;
}

export interface TicketHeaderProps {
    memberName: string;
    memberId: string;
    ticketStatus: string;
    ticketPriority: string;
    subject?: string;
    conversationState?: number;
    ticketPermissions: string[];
    onStatusChange: () => void;
    onPriorityChange: () => void;
    onTransferTicket: () => void;
    onMergeTicket?: () => void;
    onViewMember: () => void;
    onAssignToMeClicked: () => void;
    onConversationStateChanged?: (state: number) => void;
    onStateChange?: (state: number) => void;
    state: number;
    onOpenTicketSidebar: () => void;
    ticketId: string;
    agentId: string;
    isFollowingTicket: boolean;
    isAssignedToTicket: boolean;
    isLoading: boolean;
    sla?: TicketSla;
}

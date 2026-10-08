

export interface ViewTicketProps {
    ticketId: string | any;
    agentId: string;
    teamId: string;
    permissions: Record<string, boolean>;
    onViewMemberClicked?: (memberId: string) => void;
}

export interface ViewTicketWrapperProps {
    memberDetails?: { memberName: string; memberId: string };
    messages: any[];
    onSendMessage?: (message: string | Array<{ id: string; name: string; url: string }>, state: number, messageType: string) => void;
    ticketId?: string | null;
    agentId: string;
    teamId: string;
    ticketPermissions: Record<string, boolean>;
    status: string;
    priority: string;
    subject?: string;
    isLoading?: boolean;
    isError?: boolean;
    onConversationStateChanged?: (state: number) => void;
    conversationState?: number;
    onViewMemberClicked?: (memberId: string) => void;
    assignee: string;
    team: string;
    createdDate: string;
    updatedDate: string;
    ticketNumber: string;
}

export interface TicketActionsButtonWrapperProps {
    ticketStatus: string;
    permissions: Record<string, boolean>;
    onTicketStatusChangeButtonClicked?: () => void;
    onTransferButtonClicked?: () => void;
    onChangePriorityButtonClicked?: () => void;
    onViewMemberClicked?: () => void;
}

export interface TicketMessagesWrapperProps {
    messages: any[];
}

export interface ViewTicketSidebarProps {
    status: string;
    priority: string;
    assignee: string;
    team: string;
    ticketId: string;
    createdDate: string;
    updatedDate: string;
}

export interface ViewTicketSidebarWrapperProps {
    status: string;
    priority: string;
    assignee: string;
    team: string;
    ticketId: string;
    createdDate: string;
    updatedDate: string;
}

export interface MessageInputProps {
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSendMessage?: () => void;
    isSending: boolean;
    ticketPermissions: string[];
    attachments: Array<{ id: string; name: string; url: string }>;
    setAttachments: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; url: string }>>>;
    hideSendButton?: boolean;
    isInternalMail?: boolean;
    allowMentions?: boolean;
    placeholder?: string;
    getMentionApiUrl?: string;
    disabled?: boolean;
    isLoading?: boolean;
    hasFailedSend?: boolean;
}

export interface MessageInputWrapperProps {
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSendMessage: () => void;
    isSending: boolean;
    ticketPermissions: string[];
    attachments: Array<{ id: string; name: string; url: string }>;
    setAttachments: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; url: string }>>>;
    isInternalMail?: boolean;
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
    ticketPermissions: Record<string, boolean>;
    onStatusChange: () => void;
    onPriorityChange: () => void;
    onTransferTicket: () => void;
    onViewMember: () => void;
    onConversationStateChanged?: (state: number) => void;
}

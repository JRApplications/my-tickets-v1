// import type { MessageProps } from '../../../my-tickets.types';

export interface ViewChatProps {
    permissions: string[];
    agentId: string;
    teamId: string;
    conversationId: string;
    onViewMemberClicked?: (memberId: string) => void;
    onChatEnded?: () => void;
    onConvertToTicket?: (memberId: string, conversationId: string) => void;
}

export interface ChatHeaderProps {
    memberName: string;
    memberId: string;
    onViewMember: (memberId: string) => void;
    joinedChat: boolean;
    connectionStatus: string;
    onJoinChat: () => void;
    onLeaveChat: () => Promise<boolean>;
    onEndChat: () => void;
    chatEnded: boolean;
    isLoading: boolean;
    isJoining: boolean;
    isLeaving: boolean;
    isEnding: boolean;
    userType: 'member' | 'visitor';
    onConvertToTicket: () => void;
    onTransferChat: () => void;
}

export interface ViewChatWrapperProps {
    chatPermissions: string[];
    isLoading: boolean;
    isError: boolean;
    agentId: string;
    memberId: string;
    onViewMemberClicked?: (memberId: string) => void;
    messages: any[];
    onSendMessage: (message: string, attachments: Array<{ id: string; name: string; url: string }>) => Promise<boolean>;
    connectionStatus: string;
    isSiteUserTyping: boolean;
    onJoinChat: () => void;
    onLeaveChat: () => Promise<boolean>;
    conversationId: string;
    currentAgentJoined: boolean;
    isJoining: boolean;
    isLeaving: boolean;
    isEnding: boolean;
    onEndChat: () => void;
    chatEnded: boolean;
    userName: string;
    userType: 'member' | 'visitor' | any;
    onConvertToTicket: () => void;
    onTransferChat: () => void;
}

export interface ChatActionsButtonWrapperProps {
    memberId: string;
    onViewMemberClicked?: (memberId: string) => void;
    joinedChat: boolean;
    userType: 'member' | 'visitor' | any;
    onConvertToTicket: () => void;
    onTransferChat: () => void;
}

export interface ChatMessagesWrapperProps {
    messages: any[];
}

export interface MessageInputProps {
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSendMessage: () => void;
    isSending: boolean;
    chatPermissions: string[];
    attachments: Array<{ id: string; name: string; url: string }>;
    setAttachments: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; url: string }>>>;
}

export interface MessageInputWrapperProps {
    messageInput: string;
    setMessageInput: (value: string) => void;
    handleSendMessage: () => void;
    isSending: boolean;
    chatPermissions: string[];
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

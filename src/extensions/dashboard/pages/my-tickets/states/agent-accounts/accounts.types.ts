import type { Agent } from '@jrapps/my_tickets_common_types';

export interface ViewAccountsProps {
    permissions: string[];
    isAgentLimitReached?: boolean;
    onModalOpen: (modalState: 'create' | 'edit', agentId?: string) => void;
}

export interface ViewAccountsWrapperProps {
    data?: Agent[];
    permissions: string[];
    isAgentLimitReached?: boolean;
    isLoading?: boolean;
    isError?: boolean;
    onModalOpen: (modalState: 'create' | 'edit', agentId?: string) => void;
    onRemoveAgent?: (agentId: string) => Promise<void>;
}

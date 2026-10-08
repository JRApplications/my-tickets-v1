import type { Agent } from '@jrapps/my_tickets_common_types';

export interface ViewAccountsProps {
    permissions: string[];
    onModalOpen: (modalState: 'create' | 'edit', agentId?: string) => void;
}

export interface ViewAccountsWrapperProps {
    data?: Agent[];
    permissions: string[];
    isLoading?: boolean;
    isError?: boolean;
    onModalOpen: (modalState: 'create' | 'edit', agentId?: string) => void;
    onRemoveAgent?: (agentId: string) => Promise<void>;
}

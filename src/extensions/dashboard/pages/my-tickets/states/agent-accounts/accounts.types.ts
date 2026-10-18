
export interface ViewAccountsProps {
    permissions: string[];
    agentId: string;
    teamId: string;
    isAgentLimitReached?: boolean;
    onModalOpen: (modalState: 'create' | 'edit', agentId?: string) => void;
}

export interface ViewAccountsWrapperProps {
    agentId: string;
    teamId: string;
    permissions: string[];
    isAgentLimitReached?: boolean;
    onModalOpen: (modalState: 'create' | 'edit', agentId?: string) => void;
    onRemoveAgent?: (agentId: string) => Promise<void>;
}

export interface TeamData {
    _id: string;
    name?: string;
    description?: string;
    department?: string;
    teamPictureUrl?: string;
}

export interface ViewTeamsProps {
    permissions: string[];
    agentId: string;
    teamId: string;
    isTeamLimitReached?: boolean;
    onModalOpen?: (modalState: 'create' | 'edit', teamId?: string) => void;
}

export interface ViewTeamsWrapperProps {
    agentId: string;
    teamId: string;
    permissions: string[];
    isTeamLimitReached?: boolean;
    onModalOpen?: (modalState: 'create' | 'edit', teamId?: string) => void;
}

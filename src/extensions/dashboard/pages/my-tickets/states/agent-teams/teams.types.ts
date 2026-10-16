// import type { TeamData } from '../../../my-tickets.types';
interface TeamData {
    _id: string;
    name?: string;
    description?: string;
    department?: string;
    teamPictureUrl?: string;
}

export interface ViewTeamsProps {
    permissions: string[];
    isTeamLimitReached?: boolean;
    onModalOpen?: (modalState: 'create' | 'edit', teamId?: string) => void;
}

export interface ViewTeamsWrapperProps {
    data?: TeamData[];
    permissions: string[];
    isTeamLimitReached?: boolean;
    isLoading?: boolean;
    isError?: boolean;
    onModalOpen?: (modalState: 'create' | 'edit', teamId?: string) => void;
}

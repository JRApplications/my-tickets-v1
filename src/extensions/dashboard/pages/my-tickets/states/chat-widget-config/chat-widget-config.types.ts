export interface TeamOption {
    _id: string;
    name: string;
    keywords?: string[];
}

export interface Config {
    _id?: string;
    chatQuestions: string[];
    enableChatQuestions: boolean;
    businessSupportHours: BusinessSupportHoursItem[];
    useAiDirect: boolean;
    availableTeams: TeamOption[];
    generalTeamId: string;
}

export interface ChatWidgetConfigWrapperProps {
    onSave: (config: Config) => void;
    isSaving?: boolean;
    config?: Config;
    isLoading?: boolean;
    permissions: string[];
}

export interface BusinessSupportHoursItem {
    day: string;
    closed: boolean;
    startTime: Date | null;
    endTime: Date | null;
}

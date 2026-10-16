import { MainSidebar, ChatSidebar } from "../Sidebars"
import { StateId } from "@jrapps/my_tickets_common_types";
import { useTeamPresence } from './useTeamPresence';

interface SidebarProviderProps {
    stateId: StateId;
    onItemClick: (stateId: StateId) => void;
    onCreateTicketClicked: () => void;
    isTicketLimitReached?: boolean;
    onInternalMailClicked: () => void;
    onAiButtonClicked: () => void;
    onLogout: () => void;
    permissions: string[];
    teamId: string;
    agentName: string;
    agentId: string;
    agentRole: string;
    agentProfilePictureUrl: string;
    onChatClick: (chatId: string) => void;
    viewTicketStateOverride?: boolean;
    notificationProps: {
        onNotificationRemove?: (id: string) => void;
        notifications?: { id: string; title: string; subtitle: string }[];
        isLoading?: boolean;
        isError?: boolean;
    }   
    userBetaFeatures: string[];
    sidebarIsLoading: boolean;
    showUserFooter?: boolean;
}



export const SidebarProvider = ({ stateId, onItemClick, onCreateTicketClicked, isTicketLimitReached = false, onInternalMailClicked, onAiButtonClicked, onLogout, permissions, agentId, agentName, agentRole, agentProfilePictureUrl, teamId, viewTicketStateOverride, notificationProps, onChatClick, userBetaFeatures, sidebarIsLoading, showUserFooter = true }: SidebarProviderProps) => {
    const { onlineCount, status: agentStatus, setStatus: onAgentStatusChange } = useTeamPresence(teamId, agentId);

    return (
        <>
            {(stateId !== StateId.InternalChat && !viewTicketStateOverride) && <MainSidebar isLoading={sidebarIsLoading} userBetaFeatures={userBetaFeatures} notificationProps={notificationProps} stateId={stateId} permissions={permissions} onItemClick={onItemClick} onCreateTicketClicked={onCreateTicketClicked} isTicketLimitReached={isTicketLimitReached} onInternalMailClicked={onInternalMailClicked} onAiButtonClicked={onAiButtonClicked} onLogout={onLogout} agentName={agentName} agentRole={agentRole} agentProfilePictureUrl={agentProfilePictureUrl} teamId={teamId} onlineCount={onlineCount} agentStatus={agentStatus} onAgentStatusChange={onAgentStatusChange} showUserFooter={showUserFooter} />}
            {stateId === StateId.ViewChats && !viewTicketStateOverride && (<ChatSidebar permissions={permissions} teamId={teamId} onClick={onChatClick} />)}
        </>
    )
}

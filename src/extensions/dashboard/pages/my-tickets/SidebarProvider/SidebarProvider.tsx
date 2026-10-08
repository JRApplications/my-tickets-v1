import { MainSidebar, TicketsSidebar, ChatSidebar } from "../Sidebars"
import { StateId } from "@jrapps/my_tickets_common_types";
import { useRef, useEffect } from "react";
import { useTeamPresence } from './useTeamPresence';

interface SidebarProviderProps {
    stateId: StateId;
    onItemClick: (stateId: StateId) => void;
    onCreateTicketClicked: () => void;
    onInternalMailClicked: () => void;
    onAiButtonClicked: () => void;
    onLogout: () => void;
    permissions: string[];
    teamId: string;
    agentName: string;
    agentId: string;
    agentRole: string;
    agentProfilePictureUrl: string;
    onTicketClick: (ticketId: string) => void;
    onVisibleTicketsChange?: (ticketIds: string[]) => void;
    onChatClick: (chatId: string) => void;
    onGetTicketUpdateFn?: (updateFn: (ticketId: string, updates: { status?: string; priority?: string; isSpam?: boolean; isDeleted?: boolean; assignedAgent?: { id?: string; name?: string }; assignedTeam?: { id?: string; name?: string } }) => void) => void;
    viewTicketStateOverride?: boolean;
    notificationProps: {
        onNotificationRemove?: (id: string) => void;
        notifications?: { id: string; title: string; subtitle: string }[];
        isLoading?: boolean;
        isError?: boolean;
    }   
    userBetaFeatures: string[];
    sidebarIsLoading: boolean;
}



export const SidebarProvider = ({ stateId, onItemClick, onCreateTicketClicked, onInternalMailClicked, onAiButtonClicked, onLogout, permissions, agentId, agentName, agentRole, agentProfilePictureUrl, teamId, onTicketClick, onVisibleTicketsChange, onGetTicketUpdateFn, viewTicketStateOverride, notificationProps, onChatClick, userBetaFeatures, sidebarIsLoading }: SidebarProviderProps) => {
    const ticketSidebarRef = useRef<{ updateTicket: (ticketId: string, updates: { status?: string; priority?: string; isSpam?: boolean; isDeleted?: boolean; assignedAgent?: { id?: string; name?: string }; assignedTeam?: { id?: string; name?: string } }) => void } | null>(null);
    const chatSidebarRef = useRef<{ updateChat: (chatId: string, updates: { status?: string }) => void } | null>(null);
    const { onlineCount, status: agentStatus, setStatus: onAgentStatusChange } = useTeamPresence(teamId, agentId);

    useEffect(() => {
        if (ticketSidebarRef.current && onGetTicketUpdateFn) {
            onGetTicketUpdateFn(ticketSidebarRef.current.updateTicket);
        }
    }, [onGetTicketUpdateFn]);

    return (
        <>
            {(stateId !== StateId.InternalChat && !viewTicketStateOverride) && <MainSidebar isLoading={sidebarIsLoading} userBetaFeatures={userBetaFeatures} notificationProps={notificationProps} stateId={stateId} permissions={permissions} onItemClick={onItemClick} onCreateTicketClicked={onCreateTicketClicked} onInternalMailClicked={onInternalMailClicked} onAiButtonClicked={onAiButtonClicked} onLogout={onLogout} agentName={agentName} agentRole={agentRole} agentProfilePictureUrl={agentProfilePictureUrl} teamId={teamId} onlineCount={onlineCount} agentStatus={agentStatus} onAgentStatusChange={onAgentStatusChange} />}
            {stateId === StateId.ViewTickets && !viewTicketStateOverride && (<TicketsSidebar ref={ticketSidebarRef} permissions={permissions} teamId={teamId} onClick={onTicketClick} onVisibleTicketsChange={onVisibleTicketsChange} />)}
            {stateId === StateId.ViewChats && !viewTicketStateOverride && (<ChatSidebar ref={chatSidebarRef} permissions={permissions} teamId={teamId} onClick={onChatClick} />)}
        </>
    )
}

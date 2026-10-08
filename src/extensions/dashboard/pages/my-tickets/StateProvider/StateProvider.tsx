import { ViewTicket, ViewAccounts, ViewTeams, AgentRoles, ChatWidgetConfig, ChatComponentEmbedScriptConfig, InternalChat, WorkforceDashboard, SlaSettings, ReportsDashboard, OfflineFormSubmissions } from '../states';
import { StateId } from '@jrapps/my_tickets_common_types';
import MemberTicketsEmbedScriptConfig from '../states/member-tickets-embed-script-config/member-tickets-embed-script-config.route';
import ViewChat from '../states/chats/view-chat.route';
import GetSupport from '../states/get-support/get-support.route';
import HomeDashboard from '../states/home/home-dashboard';

const StateProvider = ({
    stateId,
    onCreateTicket,
    onNavigate,
    onTicketClick,
    permissions,
    teamId,
    agentId,
    teamProps,
    agentProps,
    ticketStateProps,
    internalChatStateProps,
    viewChatStateProps,
}: {
    stateId: StateId,
    onCreateTicket: () => void,
    onNavigate: (stateId: StateId) => void,
    onTicketClick: (ticketId: string) => void,
    permissions: string[],
    teamId: string,
    agentId: string,
    teamProps: {
        onModalOpen: (modalState: 'create' | 'edit', teamId?: string) => void;
    },
    agentProps: {
        onModalOpen: (modalState: 'create' | 'edit', agentId?: string) => void;
    },
    ticketStateProps: {
        ticketId: string;
        onTicketStatusChangeButtonClicked: (ticketId: string) => void;
        onChangePriorityButtonClicked: (ticketId: string) => void;
        onTransferTicketButtonClicked: (ticketId: string) => void;
        onMergeTicketClicked?: (ticketId: string) => void;
        onViewMemberClicked: (memberId: string) => void;
        onAssignToMeClicked: (params: { type: 'assign' | 'unassign' }) => void;
        updatedPriority?: string | null;
        updatedStatus?: string | null;
        viewTicketStateOverride?: boolean;
        onTicketTabChange?: (ticketId: string | null) => void;
        onPreviousTicket?: () => void;
        onNextTicket?: () => void;
        onTicketDispositionChange: (ticketId: string, updates: { isSpam: boolean; isDeleted: boolean }) => void;
        assignmentUpdate?: { ticketId: string; assignedAgent?: { id?: string; name?: string }; assignedTeam?: { id?: string; name?: string } } | null;
    },
    internalChatStateProps: {
        onAiButtonClicked: () => void;
    },
    viewChatStateProps: {
        permissions: string[];
        conversationId: string;
        onViewMemberClicked?: (memberId: string) => void;
        onChatEnded?: () => void;
        onConvertToTicket?: (memberId: string, conversationId: string) => void;
    }
}) => {
    switch (stateId) {
        case StateId.Home:
            return <HomeDashboard teamId={teamId} onCreateTicket={onCreateTicket} onNavigate={onNavigate} onTicketClick={onTicketClick} />;
        case StateId.ViewTickets:
            return <ViewTicket
                permissions={permissions}
                ticketId={ticketStateProps.ticketId}
                agentId={agentId}
                teamId={teamId}
                onTicketStatusChangeButtonClicked={ticketStateProps.onTicketStatusChangeButtonClicked}
                onChangePriorityButtonClicked={ticketStateProps.onChangePriorityButtonClicked}
                onTransferTicketButtonClicked={ticketStateProps.onTransferTicketButtonClicked}
                onMergeTicketClicked={ticketStateProps.onMergeTicketClicked}
                onViewMemberClicked={ticketStateProps.onViewMemberClicked}
                onAssignToMeClicked={ticketStateProps.onAssignToMeClicked}
                updatedPriority={ticketStateProps.updatedPriority}
                updatedStatus={ticketStateProps.updatedStatus}
                viewTicketStateOverride={ticketStateProps.viewTicketStateOverride}
                onTicketTabChange={ticketStateProps.onTicketTabChange}
                onPreviousTicket={ticketStateProps.onPreviousTicket}
                onNextTicket={ticketStateProps.onNextTicket}
                onTicketDispositionChange={ticketStateProps.onTicketDispositionChange}
                assignmentUpdate={ticketStateProps.assignmentUpdate}
            />;
        case StateId.ManageAgents:
            return <ViewAccounts
                permissions={permissions}
                onModalOpen={agentProps.onModalOpen}
            />;
        case StateId.ManageTeams:
            return <ViewTeams
                permissions={permissions}
                onModalOpen={teamProps.onModalOpen}
            />;
        case StateId.Workforce:
            return <WorkforceDashboard teamId={teamId} agentId={agentId} permissions={permissions} />;
        case StateId.ManageRoles:
            return <AgentRoles
                permissions={permissions}
            />;
        case StateId.ChatWidgetConfig:
            return <ChatWidgetConfig
                permissions={permissions}
            />;
        case StateId.SlaSettings:
            return <SlaSettings
                permissions={permissions}
            />;
        case StateId.Reports:
            return <ReportsDashboard teamId={teamId} permissions={permissions} />;
        case StateId.OfflineFormSubmissions:
            return <OfflineFormSubmissions permissions={permissions} />;
        case StateId.ChatComponentEmbedScriptConfig:
            return <ChatComponentEmbedScriptConfig
                permissions={permissions}
            />;
        case StateId.MemberTicketsDesign:
            return <MemberTicketsEmbedScriptConfig
                permissions={permissions}
            />;
        case StateId.InternalChat:
            return <InternalChat
                permissions={permissions}
                teamId={teamId}
                agentId={agentId}
                onAiButtonClicked={internalChatStateProps.onAiButtonClicked}
            />;
        case StateId.ViewChats:
            return <ViewChat
                permissions={viewChatStateProps.permissions}
                conversationId={viewChatStateProps.conversationId}
                agentId={agentId}
                onViewMemberClicked={viewChatStateProps.onViewMemberClicked}
                onChatEnded={viewChatStateProps.onChatEnded}
                onConvertToTicket={viewChatStateProps.onConvertToTicket}
                teamId={teamId}
            />;
        case StateId.GetSupport:
            return <GetSupport />
        default:
            return null;
    }
};
export default StateProvider;

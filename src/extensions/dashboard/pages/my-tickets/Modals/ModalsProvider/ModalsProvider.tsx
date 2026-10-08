import { CreateTicketModal } from '../CreateTicketModal';
import { TeamModal } from '../TeamModal';
import { AgentModal } from '../AgentModal';
import { AiModal } from '../AiModal';
import { PriorityModal } from '../PriorityModal';
import { StatusModal } from '../StatusModal';
import { TransferModal } from '../TransferModal';
import { ViewMemberModal } from '../ViewMemberModal';
import { AssignTicketConfirmModal } from '../AssignTicketConfirmModal';
import { MergeTicketModal } from '../MergeTicketModal';

interface ModalsProviderProps {
    createTicketProps: {
        isOpen: boolean;
        onClose: () => void;
        agentId: string;
        userBetaFeatures: string[];
        initialMemberId?: string;
        chatConversationId?: string;
    };
    teamProps: {
        isOpen: boolean;
        onClose: () => void;
        state: any;
        teamId: string;
    };
    agentProps: {
        isOpen: boolean;
        onClose: () => void;
        state: any;
        agentId: string;
    };
    aiProps: {
        isOpen: boolean;
        onClose: () => void;
        agentName: string;
        logoUrl: string;
        state: string;
    };
    priorityProps: {
        isOpen: boolean;
        onClose: () => void;
        ticketId: string;
        onSuccess?: (newPriority: string) => void;
    };
    statusProps: {
        isOpen: boolean;
        onClose: () => void;
        ticketId: string;
        onSuccess?: (newStatus: string) => void;
    };
    transferProps: {
        isOpen: boolean;
        onClose: () => void;
        ticketId: string;
    };
    viewMemberProps: {
        isOpen: boolean;
        onClose: () => void;
        memberId: string;
    };
    assignTicketConfirmProps: {
        isOpen: boolean;
        assignType: 'assign' | 'unassign';
        onClose: ({ assigned }: { assigned: boolean }) => void;
    };
    mergeTicketProps: {
        isOpen: boolean;
        onClose: () => void;
        primaryTicketId: string;
        secondaryTicketId: string;
        onMergeComplete?: (mergedTicketNumber: string) => void;
        agentId: string;
    };
}

const ModalsProvider = (props: ModalsProviderProps) => {
    return (
        <>
            <CreateTicketModal isOpen={props.createTicketProps.isOpen} onClose={props.createTicketProps.onClose} agentId={props.createTicketProps.agentId} userBetaFeatures={props.createTicketProps.userBetaFeatures} initialMemberId={props.createTicketProps.initialMemberId} chatConversationId={props.createTicketProps.chatConversationId} />
            <TeamModal isOpen={props.teamProps.isOpen} onClose={props.teamProps.onClose} state={props.teamProps.state} teamId={props.teamProps.teamId} />
            <AgentModal isOpen={props.agentProps.isOpen} onClose={props.agentProps.onClose} state={props.agentProps.state} agentId={props.agentProps.agentId} />
            <AiModal isOpen={props.aiProps.isOpen} logoUrl={props.aiProps.logoUrl} agentName={props.aiProps.agentName} onClose={props.aiProps.onClose} state={props.aiProps.state} />
            <PriorityModal isOpen={props.priorityProps.isOpen} onClose={props.priorityProps.onClose} ticketId={props.priorityProps.ticketId} onSuccess={props.priorityProps.onSuccess} />
            <StatusModal isOpen={props.statusProps.isOpen} onClose={props.statusProps.onClose} ticketId={props.statusProps.ticketId} onSuccess={props.statusProps.onSuccess} />
            <TransferModal isOpen={props.transferProps.isOpen} onClose={props.transferProps.onClose} ticketId={props.transferProps.ticketId} />
            <ViewMemberModal isOpen={props.viewMemberProps.isOpen} onClose={props.viewMemberProps.onClose} memberId={props.viewMemberProps.memberId} />
            <AssignTicketConfirmModal isOpen={props.assignTicketConfirmProps.isOpen} assignType={props.assignTicketConfirmProps.assignType} onClose={props.assignTicketConfirmProps.onClose} />
            <MergeTicketModal
                isOpen={props.mergeTicketProps.isOpen}
                onClose={props.mergeTicketProps.onClose}
                primaryTicketId={props.mergeTicketProps.primaryTicketId}
                secondaryTicketId={props.mergeTicketProps.secondaryTicketId}
                onMergeComplete={props.mergeTicketProps.onMergeComplete}
                agentId={props.mergeTicketProps.agentId}
            />
        </>
    );
};

export default ModalsProvider;

import { useEffect, useState } from 'react';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import { myTicketsFetchWithAuth } from '../../../auth/myTicketsFetchWithAuth';

interface Team {
    _id: string;
    name: string;
}

interface ChatTransferModalOptions {
    isOpen: boolean;
    currentTeamId: string;
    conversationId: string;
    onClose: () => void;
    onTransferComplete: () => Promise<boolean>;
}

export const useChatTransferModal = ({
    isOpen,
    currentTeamId,
    conversationId,
    onClose,
    onTransferComplete,
}: ChatTransferModalOptions) => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTeamsError, setIsTeamsError] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        let isCurrent = true;
        setIsLoading(true);
        setIsTeamsError(false);
        setSelectedTeamId('');

        const fetchTeams = async () => {
            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/teams/get`);
                const result: { success?: boolean; error?: string; teams?: Team[] } = await response.json();
                if (!response.ok || !result.success || !Array.isArray(result.teams)) {
                    throw new Error(result.error || `Failed to load teams (${response.status})`);
                }
                if (isCurrent) setTeams(result.teams);
            } catch (error) {
                console.error('Failed to load teams for chat transfer', error);
                if (isCurrent) setIsTeamsError(true);
            } finally {
                if (isCurrent) setIsLoading(false);
            }
        };

        void fetchTeams();
        return () => {
            isCurrent = false;
        };
    }, [currentTeamId, isOpen]);

    const handleTransfer = async () => {
        if (!selectedTeamId || isSaving) return;

        setIsSaving(true);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/chat-admin/transferChat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId, teamId: selectedTeamId }),
            });
            const result: { success?: boolean; error?: string } = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || `Failed to transfer chat (${response.status})`);
            }

            const didLeaveChat = await onTransferComplete();
            onClose();
            ShowToast({
                message: didLeaveChat
                    ? 'Chat transferred successfully.'
                    : 'Chat was transferred, but you could not leave it. Please refresh the chat.',
                type: didLeaveChat ? 'success' : 'error',
            });
        } catch (error) {
            console.error('Failed to transfer chat', error);
            ShowToast({ message: 'Failed to transfer chat. Please try again.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const availableTeams = teams.filter((team) => team._id !== currentTeamId);
    const teamOptions = availableTeams.map((team) => ({ id: team._id, value: team.name }));
    const currentTeamName = teams.find((team) => team._id === currentTeamId)?.name || currentTeamId;

    return {
        teamOptions,
        selectedTeamId,
        setSelectedTeamId,
        isLoading,
        isSaving,
        isTeamsError,
        currentTeamName,
        handleTransfer,
    };
};

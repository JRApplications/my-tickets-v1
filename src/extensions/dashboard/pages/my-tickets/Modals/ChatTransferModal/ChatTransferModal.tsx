import { Box, CustomModalLayout, Dropdown, FormField, Loader, Modal } from '@wix/design-system';
import { useChatTransferModal } from './hooks/useChatTransferModal';

interface ChatTransferModalProps {
    isOpen: boolean;
    currentTeamId: string;
    conversationId: string;
    onClose: () => void;
    onTransferComplete: () => Promise<boolean>;
}

const ChatTransferModal = ({
    isOpen,
    currentTeamId,
    conversationId,
    onClose,
    onTransferComplete,
}: ChatTransferModalProps) => {
    const {
        teamOptions,
        selectedTeamId,
        setSelectedTeamId,
        isLoading,
        isSaving,
        isTeamsError,
        currentTeamName,
        handleTransfer,
    } = useChatTransferModal({
        isOpen,
        currentTeamId,
        conversationId,
        onClose,
        onTransferComplete,
    });

    return (
        <Modal isOpen={isOpen} onRequestClose={isSaving ? undefined : onClose}>
            <CustomModalLayout
                title={<CustomModalLayout.Title>Transfer Chat</CustomModalLayout.Title>}
                subtitle={`Current team: ${currentTeamName}`}
                primaryButtonText={isSaving ? <Loader size="tiny" /> : 'Transfer'}
                primaryButtonProps={{
                    onClick: () => void handleTransfer(),
                    disabled: isLoading || isSaving || isTeamsError || !selectedTeamId,
                }}
                secondaryButtonText="Cancel"
                secondaryButtonProps={{ onClick: onClose, disabled: isSaving }}
                closeButtonProps={{ onClick: onClose, size: 'large' }}
                showHeaderDivider
                showFooterDivider
            >
                {isLoading ? (
                    <Box height="60px" width="100%" verticalAlign="middle" align="center">
                        <Loader size="small" />
                    </Box>
                ) : isTeamsError ? (
                    <Box height="60px" width="100%" verticalAlign="middle" align="center">
                        <Loader status="error" text="Failed to load teams. Please close and try again." />
                    </Box>
                ) : (
                    <FormField label="New team" required>
                        <Dropdown
                            selectedId={selectedTeamId}
                            onSelect={(option) => setSelectedTeamId(String(option.id))}
                            options={teamOptions}
                            placeholder={teamOptions.length ? 'Select a team' : 'No other teams available'}
                            popoverProps={{ appendTo: 'window', zIndex: 10000 }}
                            disabled={isSaving || teamOptions.length === 0}
                        />
                    </FormField>
                )}
            </CustomModalLayout>
        </Modal>
    );
};

export default ChatTransferModal;

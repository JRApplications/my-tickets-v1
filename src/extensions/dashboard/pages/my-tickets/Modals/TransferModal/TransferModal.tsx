import { Modal, CustomModalLayout, Box, Loader, FormField, Input, Dropdown, SkeletonRectangle } from '@wix/design-system';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import { useTransferModal } from './hooks/useTransferModal';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticketId: string;
}

const TransferModal = ({ isOpen, onClose, ticketId }: TransferModalProps) => {

    const { isLoading, isError, isSaving, handleSave, currentPrimaryTeam, dropdownPrimaryTeam, handleOnSelect, primaryTicketNumber, teamOptions } = useTransferModal(ticketId, isOpen);

    return (
        <Modal isOpen={isOpen} onRequestClose={isSaving ? undefined : onClose}>
            <CustomModalLayout
                primaryButtonText={!isSaving ? "Save" : <Loader size='tiny' />}
                secondaryButtonText="Cancel"
                closeButtonProps={{ onClick: onClose, size: 'large' }}
                title={<CustomModalLayout.Title>Transfer Ticket {!isLoading && primaryTicketNumber ? `#${primaryTicketNumber}` : ''}</CustomModalLayout.Title>}
                subtitle={"Transfer this ticket to a new primary team"}
                primaryButtonProps={{
                    onClick: (() => handleSave().then(({ success }) => {
                        if (success) {
                            onClose();
                        } else {
                            ShowToast({ message: 'Failed to transfer ticket. Please try again.', type: 'error' });
                        }
                    })),
                    disabled: isSaving || isLoading || isError || !dropdownPrimaryTeam.id,
                }}
                secondaryButtonProps={{
                    onClick: () => {
                        onClose();
                    },
                    disabled: isSaving,
                }}
                showHeaderDivider
                showFooterDivider
            >
                {isError && (
                    <Box height='100%' width='100%' verticalAlign='middle' align='center' paddingTop={2} paddingBottom={2}>
                        <Loader status='error' text='An error occurred. Try again or contact support.' />
                    </Box>
                )}
                {!isError && (
                    <Box direction='vertical' gap={2}>
                        {isLoading ? <SkeletonRectangle width='100%' height='35px' /> : (
                            <FormField label="Current Primary Team">
                                <Input value={currentPrimaryTeam} readOnly />
                            </FormField>
                        )}

                        {isLoading ? <SkeletonRectangle width='100%' height='35px' /> : (
                            <FormField label="New Primary Team" required>
                                <Dropdown
                                    selectedId={dropdownPrimaryTeam.id}
                                    onSelect={handleOnSelect}
                                    options={teamOptions}
                                    popoverProps={{ appendTo: 'window', zIndex: 10000 }}
                                    disabled={isSaving}
                                />
                            </FormField>
                        )}
                    </Box>
                )}
            </CustomModalLayout>
        </Modal>
    )
};

export default TransferModal;

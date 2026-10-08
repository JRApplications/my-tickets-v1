import { Modal, CustomModalLayout, Box, Loader, FormField, Input, Dropdown, SkeletonRectangle } from '@wix/design-system';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import { PRIORITY_OPTIONS, type TicketPriority, formatPriority } from '@jrapps/my_tickets_common_types';
import { usePriorityModal } from './hooks/usePriorityModal';

interface PriorityModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticketId: string;
    onSuccess?: (newPriority: string) => void;
}

const PriorityModal = ({ isOpen, onClose, ticketId, onSuccess }: PriorityModalProps) => {
    const { isLoading, isError, isSaving, handleSave, currentPriority, dropdownPriority, handleOnSelect, primaryTicketNumber } = usePriorityModal(ticketId, isOpen);

    return (
        <Modal isOpen={isOpen} onRequestClose={isSaving ? undefined : onClose}>
            <CustomModalLayout
                primaryButtonText={!isSaving ? "Save" : <Loader size='tiny' />}
                secondaryButtonText="Cancel"
                closeButtonProps={{ onClick: onClose, size: 'large' }}
                title={<CustomModalLayout.Title>Priority For Ticket {!isLoading && primaryTicketNumber ? `#${primaryTicketNumber}` : ''}</CustomModalLayout.Title>}
                subtitle={"Update the priority for this ticket"}
                primaryButtonProps={{
                    onClick: (() => handleSave().then(({ success }) => {
                        if (success) {
                            if (onSuccess) onSuccess(dropdownPriority);
                            onClose();
                        } else {
                            ShowToast({ message: 'Failed to update priority. Please try again.', type: 'error' });
                        }
                    })),
                    disabled: isSaving,
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

                        {isLoading ? <SkeletonRectangle width="100%" height="35px" /> : (
                            <FormField label="Current Priority">
                                <Input value={formatPriority(currentPriority as TicketPriority)} readOnly />
                            </FormField>
                        )}

                        {isLoading ? <SkeletonRectangle width="100%" height="35px" /> : (
                            <FormField label="New Priority" required>
                                <Dropdown
                                    options={PRIORITY_OPTIONS}
                                    selectedId={dropdownPriority}
                                    onSelect={handleOnSelect}
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

export default PriorityModal;
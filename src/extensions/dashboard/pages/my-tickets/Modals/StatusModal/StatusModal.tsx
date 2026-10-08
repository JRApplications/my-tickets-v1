import { Modal, CustomModalLayout, Box, Loader, FormField, Input, Dropdown, SkeletonRectangle } from '@wix/design-system';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import { STATUS_OPTIONS, type TicketStatus, formatStatus } from '@jrapps/my_tickets_common_types';
import { useStatusModal } from './hooks/useStatusModal';

interface StatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticketId: string;
    onSuccess?: (newStatus: string) => void;
}

const StatusModal = ({ isOpen, onClose, ticketId, onSuccess }: StatusModalProps) => {
    const { isLoading, isError, isSaving, handleSave, currentStatus, dropdownStatus, handleOnSelect, primaryTicketNumber } = useStatusModal(ticketId, isOpen);

    return (
        <Modal isOpen={isOpen} onRequestClose={isSaving ? undefined : onClose}>
            <CustomModalLayout
                primaryButtonText={!isSaving ? "Save" : <Loader size='tiny' />}
                secondaryButtonText="Cancel"
                closeButtonProps={{ onClick: onClose, size: 'large' }}
                title={<CustomModalLayout.Title>Status For Ticket {!isLoading && primaryTicketNumber ? `#${primaryTicketNumber}` : ''}</CustomModalLayout.Title>}
                subtitle={"Update the status for this ticket"}
                primaryButtonProps={{
                    onClick: (() => handleSave().then(({ success }) => {
                        if (success) {
                            if (onSuccess) onSuccess(dropdownStatus);
                            onClose();
                        } else {
                            ShowToast({ message: 'Failed to update status. Please try again.', type: 'error' });
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
                {isError && !isSaving && (
                    <Box height='100%' width='100%' verticalAlign='middle' align='center' paddingTop={2} paddingBottom={2}>
                        <Loader status='error' text='An error occurred. Try again or contact support.' />
                    </Box>
                )}

                {!isError && (
                    <Box direction='vertical' gap={2}>

                        {isLoading ? <SkeletonRectangle width="100%" height="35px" /> : (
                            <FormField label="Current Status">
                                <Input value={formatStatus(currentStatus as TicketStatus)} readOnly />
                            </FormField>
                        )}

                        {isLoading ? <SkeletonRectangle width="100%" height="35px" /> : (
                            <FormField label="New Status" required>
                                <Dropdown
                                    options={STATUS_OPTIONS}
                                    selectedId={dropdownStatus}
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

export default StatusModal;
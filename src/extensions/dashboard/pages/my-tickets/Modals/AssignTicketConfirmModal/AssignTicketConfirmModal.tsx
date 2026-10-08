import { Modal, MessageModalLayout, Text } from "@wix/design-system";

const AssignTicketConfirmModal = ({ isOpen, assignType, onClose }: { isOpen: boolean; assignType: 'assign' | 'unassign'; onClose: ({ assigned }: { assigned: boolean }) => void }) => {
    return (
        <Modal isOpen={isOpen} onRequestClose={() => onClose({ assigned: false })}>
            <MessageModalLayout
                skin="standard"
                primaryButtonText={assignType === 'assign' ? "Assign" : "Unassign"}
                secondaryButtonText="Cancel"
                actionsSize="medium"
                title={assignType === 'assign' ? "Assign Ticket?" : "Unassign Ticket?"}
                primaryButtonOnClick={() => onClose({ assigned: true })}
                secondaryButtonOnClick={() => onClose({ assigned: false })}
                subtitle={<Text size='medium'>Are you sure you want to {assignType === 'assign' ? "assign" : "unassign"} this ticket?</Text>}
            />
        </Modal>
    )
};

export default AssignTicketConfirmModal;
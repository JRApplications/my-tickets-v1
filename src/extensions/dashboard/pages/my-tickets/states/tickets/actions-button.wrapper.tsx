import { type FC, useState } from 'react';
import { DropdownBase, Button, listItemActionBuilder } from '@wix/design-system';
import { ChevronDown, Replace, Redo, Badge, Visible, Add } from '@wix/wix-ui-icons-common/odeditor';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import type { TicketActionsButtonWrapperProps as ActionsButtonWrapperProps } from './tickets.types';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import { DataConnect, Merge } from '@wix/wix-ui-icons-common';

const ActionsButtonWrapper: FC<ActionsButtonWrapperProps> = ({ ticketStatus, permissions, memberId, onTicketStatusChangeButtonClicked, onTransferButtonClicked, onChangePriorityButtonClicked, onMergeTicketClicked, onViewMemberClicked, onAssignToMeClicked, isFollowingTicket, ticketId, agentId, isAssignedToTicket }) => {
    const [isFollowActionLoading, setIsFollowActionLoading] = useState(false);

    const canChangeStatus = !(ticketStatus === 'open' && !permissions?.includes('my-tickets-close-single-ticket')) && !(ticketStatus === 'closed' && !permissions?.includes('my-tickets-reopen-single-ticket'));
    const canTransferTicket = permissions?.includes('my-tickets-transfer-ticket');
    const canMergeTicket = permissions?.includes('my-tickets-merge-tickets');
    const canChangePriority = permissions?.includes('my-tickets-change-ticket-priority');
    const canViewMember = permissions?.includes('my-tickets-view-members');

    const handleFollowButtonClick = async () => {
        setIsFollowActionLoading(true);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            if (isFollowingTicket) {
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/unfollowTicket`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ticketId, agentId })
                });

                const data = await response.json();
                if (data.success) {
                    ShowToast({ message: 'Successfully unfollowed the ticket', type: 'success' });
                } else {
                    ShowToast({ message: 'Failed to unfollow the ticket', type: 'error' });
                }

            } else {
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/followTicket`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ticketId, agentId })
                });
                const data = await response.json();
                if (data.success) {
                    ShowToast({ message: 'Successfully followed the ticket', type: 'success' });
                } else {
                    ShowToast({ message: 'Failed to follow the ticket', type: 'error' });
                }
            }
        } finally {
            setIsFollowActionLoading(false);
        }
    };
    const options = [
        ...(!canChangeStatus ? [] : [listItemActionBuilder({
            id: 1,
            title: 'Change Status',
            subtitle: canChangeStatus ? undefined : "You don't have permission to change this ticket's status",
            prefixIcon: <Redo />,
            disabled: !canChangeStatus,
            onClick: () => {
                if (onTicketStatusChangeButtonClicked) {
                    onTicketStatusChangeButtonClicked();
                }
            }
        })]),
        ...(!canTransferTicket ? [] : [listItemActionBuilder({
            id: 2,
            title: 'Transfer Ticket',
            subtitle: canTransferTicket ? undefined : "You don't have permission to transfer tickets",
            prefixIcon: <DataConnect />,
            disabled: !canTransferTicket,
            onClick: () => {
                if (onTransferButtonClicked) {
                    onTransferButtonClicked();
                }
            }
        })]),
        ...(!canMergeTicket ? [] : [listItemActionBuilder({
            id: 7,
            title: 'Merge Ticket',
            subtitle: canMergeTicket ? undefined : "You don't have permission to merge tickets",
            prefixIcon: <Merge />,
            disabled: !canMergeTicket,
            onClick: () => {
                if (onMergeTicketClicked) {
                    onMergeTicketClicked();
                }
            }
        })]),
        ...(!canChangePriority ? [] : [listItemActionBuilder({
            id: 3,
            title: 'Change Priority',
            subtitle: canChangePriority ? undefined : "You don't have permission to change ticket priority",
            prefixIcon: <Replace />,
            disabled: !canChangePriority,
            onClick: () => {
                if (onChangePriorityButtonClicked) {
                    onChangePriorityButtonClicked();
                }
            }
        })]),
        ...(!canViewMember ? [] : [listItemActionBuilder({
            id: 4,
            title: 'View Member',
            prefixIcon: <Visible />,
            disabled: !canViewMember,
            onClick: () => {
                if (onViewMemberClicked) {
                    onViewMemberClicked(memberId);
                }
            }
        })]),
        
        listItemActionBuilder({
            id: 5,
            title: isAssignedToTicket ? 'Unassign from me' : 'Assign to me',
            prefixIcon: <Badge />,
            onClick: () => {
                if (onAssignToMeClicked) {
                    onAssignToMeClicked({ type: isAssignedToTicket ? 'unassign' : 'assign' });
                }
            }
        }),
        ...(isFollowingTicket !== undefined ? [listItemActionBuilder({
            id: 6,
            title: isFollowingTicket ? 'Unfollow' : 'Follow',
            prefixIcon: <Add />,
            disabled: isFollowActionLoading,
            onClick: handleFollowButtonClick
        })] : []),

    ];

    return (
        <DropdownBase options={options} appendTo={'window'} maxHeight={'400px'}>
            {({ toggle }) => (
                <Button size='small' priority="secondary" onClick={toggle} suffixIcon={<ChevronDown />}>
                    Actions
                </Button>
            )}
        </DropdownBase>
    );
}

export default ActionsButtonWrapper;
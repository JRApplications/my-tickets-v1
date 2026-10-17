import { useEffect, useState } from 'react';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';
import type { TicketAssigneeOption } from './tickets-list';
import TicketsListWrapper from './tickets-list.wrapper';

const baseApiUrl = new URL(import.meta.url).origin;

interface TicketsAssigneesResponse {
    success?: unknown;
    assignees?: unknown;
    error?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isTicketAssigneeOption = (value: unknown): value is TicketAssigneeOption =>
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.value === 'string';

interface TicketsListProps {
    teamId: string;
    permissions: string[];
    onTicketClick: (ticketId: string) => void;
    onCreateTicket: () => void;
    isTicketLimitReached?: boolean;
    onVisibleTicketsChange?: (ticketIds: string[]) => void;
    onGetTicketUpdateFn?: (updateFn: (ticketId: string, updates: { status?: string; priority?: string; isSpam?: boolean; isDeleted?: boolean; assignedAgent?: { id?: string; name?: string }; assignedTeam?: { id?: string; name?: string } }) => void) => void;
}

const TicketsList = ({ teamId, permissions, onTicketClick, onCreateTicket, isTicketLimitReached, onVisibleTicketsChange, onGetTicketUpdateFn }: TicketsListProps) => {
    const [assigneeOptions, setAssigneeOptions] = useState<TicketAssigneeOption[]>([]);

    useEffect(() => {
        let isCurrent = true;
        setAssigneeOptions([]);

        const loadAssignees = async () => {
            try {
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/sidebar/assignees`);
                const payload: TicketsAssigneesResponse = await response.json();
                if (
                    !response.ok ||
                    payload.success !== true ||
                    !Array.isArray(payload.assignees) ||
                    !payload.assignees.every(isTicketAssigneeOption)
                ) {
                    const message = typeof payload.error === 'string'
                        ? payload.error
                        : `Failed to load ticket assignees (${response.status})`;
                    throw new Error(message);
                }
                if (isCurrent) setAssigneeOptions(payload.assignees);
            } catch (error) {
                if (!isCurrent) return;
                console.error('Failed to load ticket assignees', error);
                const message = error instanceof Error ? error.message : 'Failed to load ticket assignees';
                ShowToast({ message, type: 'error' });
            }
        };

        void loadAssignees();
        return () => { isCurrent = false; };
    }, [teamId]);

    return (
        <TicketsListWrapper
            key={teamId}
            teamId={teamId}
            assigneeOptions={assigneeOptions}
            permissions={permissions}
            onTicketClick={onTicketClick}
            onCreateTicket={onCreateTicket}
            isTicketLimitReached={isTicketLimitReached}
            onVisibleTicketsChange={onVisibleTicketsChange}
            onGetTicketUpdateFn={onGetTicketUpdateFn}
        />
    );
};

export default TicketsList;

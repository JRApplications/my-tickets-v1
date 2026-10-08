import { useState, useEffect } from 'react';
import { myTicketsFetchWithAuth } from '../../../auth/myTicketsFetchWithAuth';
import type { TicketStatus, TicketPriority, Ticket } from '@jrapps/my_tickets_common_types';


export interface MergeModalState {
    primaryTicket: Ticket | null;
    secondaryTicket: Ticket | null;
    isLoading: boolean;
    isError: string | null;
    isSaving: boolean;
    validationErrors: string[];
    validationWarnings: string[];
    canMerge: boolean;

    // Form state
    mergedTitle: string;
    finalStatus: TicketStatus;
    finalPriority: TicketPriority;
    selectedAgentId: string;
    mergeReason: string;
}

export const useMergeTicketModal = (
    primaryTicketId: string,
    secondaryTicketId: string,
    isOpen: boolean,
    agentId: string
) => {
    const [state, setState] = useState<MergeModalState>({
        primaryTicket: null,
        secondaryTicket: null,
        isLoading: true,
        isError: null,
        isSaving: false,
        validationErrors: [],
        validationWarnings: [],
        canMerge: true,
        mergedTitle: '',
        finalStatus: 'open' as TicketStatus,
        finalPriority: 'medium' as TicketPriority,
        selectedAgentId: '',
        mergeReason: ''
    });

    // Load tickets and validate on modal open
    useEffect(() => {
        if (!isOpen || !primaryTicketId || !secondaryTicketId) return;

        const loadAndValidate = async () => {
            setState(prev => ({ ...prev, isLoading: true, isError: null }));
            try {
                const baseApiUrl = new URL(import.meta.url).origin;

                // Fetch both tickets
                const [primaryRes, secondaryRes, validateRes] = await Promise.all([
                    myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/getTicketById?id=${primaryTicketId}`),
                    myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/getTicketById?id=${secondaryTicketId}`),
                    myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/validateMerge?ticketId1=${primaryTicketId}&ticketId2=${secondaryTicketId}`)
                ]);

                const primaryData = await primaryRes.json();
                const secondaryData = await secondaryRes.json();
                const validateData = await validateRes.json();

                if (!primaryData.success || !secondaryData.success) {
                    setState(prev => ({ ...prev, isError: 'Failed to load tickets', isLoading: false }));
                    return;
                }

                const primaryTicket = primaryData.ticket;
                const secondaryTicket = secondaryData.ticket;

                // Set default form values
                setState(prev => ({
                    ...prev,
                    primaryTicket,
                    secondaryTicket,
                    isLoading: false,
                    mergedTitle: `[MERGED] ${primaryTicket.subject} + ${secondaryTicket.subject}`,
                    finalStatus: 'open' as TicketStatus,
                    finalPriority: primaryTicket.priority,
                    selectedAgentId: primaryTicket.assignedAgent?.id || '',
                    validationErrors: validateData.errors || [],
                    validationWarnings: validateData.warnings || [],
                    canMerge: validateData.canMerge || false
                }));
            } catch (error: any) {
                setState(prev => ({ ...prev, isError: error.message || 'Error loading tickets', isLoading: false }));
            }
        };

        loadAndValidate();
    }, [primaryTicketId, secondaryTicketId, isOpen]);

    const handleMerge = async () => {
        setState(prev => ({ ...prev, isSaving: true, isError: null }));
        try {
            const baseApiUrl = new URL(import.meta.url).origin;

            const payload = {
                primaryTicketId,
                secondaryTicketId,
                newSubject: state.mergedTitle,
                finalStatus: state.finalStatus,
                finalPriority: state.finalPriority,
                assignedAgentId: state.selectedAgentId || undefined,
                reason: state.mergeReason || undefined,
                agentId
            };

            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/merge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                return {
                    success: true,
                    mergedTicketId: result.mergedTicketId,
                    mergedTicketNumber: result.mergedTicketNumber
                };
            } else {
                setState(prev => ({
                    ...prev,
                    isSaving: false,
                    isError: result.error || 'Error merging tickets'
                }));
                return { success: false };
            }
        } catch (error: any) {
            setState(prev => ({
                ...prev,
                isSaving: false,
                isError: error.message || 'Error merging tickets'
            }));
            return { success: false };
        }
    };

    return {
        ...state,
        setState,
        handleMerge,
        updateMergedTitle: (title: string) => setState(prev => ({ ...prev, mergedTitle: title })),
        updateFinalStatus: (status: TicketStatus) => setState(prev => ({ ...prev, finalStatus: status })),
        updateFinalPriority: (priority: TicketPriority) => setState(prev => ({ ...prev, finalPriority: priority })),
        updateSelectedAgentId: (agentId: string) => setState(prev => ({ ...prev, selectedAgentId: agentId })),
        updateMergeReason: (reason: string) => setState(prev => ({ ...prev, mergeReason: reason }))
    };
};

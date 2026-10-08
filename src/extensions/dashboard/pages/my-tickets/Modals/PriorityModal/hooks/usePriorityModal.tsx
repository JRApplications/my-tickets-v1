import { useState, useEffect } from 'react';
import { myTicketsFetchWithAuth } from '../../../auth/myTicketsFetchWithAuth';

export const usePriorityModal = (ticketId: string, isOpen: boolean) => {
    const [currentPriority, setCurrentPriority] = useState('');
    const [dropdownPriority, setDropdownPriority] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [primaryTicketNumber, setPrimaryTicketNumber] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const fetchStatus = async () => {
            setIsLoading(true);
            setIsError(false);
            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/getPriority?id=${ticketId}`);
                const result = await response.json();
                if (result.success) {
                    setCurrentPriority(result.priority);
                    setPrimaryTicketNumber(result.ticketNumber);
                } else {
                    setIsError(true);
                }
            } catch (error) {
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStatus();
    }, [ticketId, isOpen]);

    const handleSave = async (): Promise<{ success: boolean }> => {
        setIsSaving(true);
        setIsError(false);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/updatePriority?id=${ticketId}&priority=${dropdownPriority}`, {
                method: 'PUT',
            });
            const result = await response.json();
            if (result.success) {
                setCurrentPriority(dropdownPriority);
                setDropdownPriority('');
                setPrimaryTicketNumber('');
                return { success: true };
            } else {
                setIsError(true);
                return { success: false };
            }
        } catch (error) {
            setIsError(true);
            return { success: false };
        } finally {
            setIsSaving(false);
        }
    };

    const handleOnSelect = (e: any) => {
        setDropdownPriority(e.id);
    };

    return {
        isLoading,
        isError,
        isSaving,
        currentPriority,
        dropdownPriority,
        handleSave,
        handleOnSelect,
        primaryTicketNumber,
    };
};

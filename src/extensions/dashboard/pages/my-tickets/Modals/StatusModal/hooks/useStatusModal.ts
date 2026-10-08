import { useState, useEffect } from 'react';
import { myTicketsFetchWithAuth } from '../../../auth/myTicketsFetchWithAuth';

export const useStatusModal = (ticketId: string, isOpen: boolean) => {
    const [currentStatus, setCurrentStatus] = useState('');
    const [dropdownStatus, setDropdownStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [primaryTicketNumber, setPrimaryTicketNumber] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const fetchCurrentStatus = async () => {
            setIsLoading(true);
            setIsError(false);
            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/getStatus?id=${ticketId}`);
                const result = await response.json();
                if (result.success) {
                    setCurrentStatus(result.status);
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
        fetchCurrentStatus();
    }, [ticketId, isOpen]);

    const handleSave = async (): Promise<{ success: boolean }> => {
        setIsSaving(true);
        setIsError(false);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/updateStatus?id=${ticketId}&status=${dropdownStatus}`, {
                method: 'PUT',
            });
            const result = await response.json();
            if (result.success) {
                setCurrentStatus(dropdownStatus);
                setDropdownStatus('');
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
        setDropdownStatus(e.id);
    };

    return {
        isLoading,
        isError,
        isSaving,
        currentStatus,
        dropdownStatus,
        handleSave,
        handleOnSelect,
        primaryTicketNumber,
    };
};

import { useState, useEffect } from 'react';
import { myTicketsFetchWithAuth } from '../../../auth/myTicketsFetchWithAuth';

export const useTransferModal = (ticketId: string, isOpen: boolean) => {
    const [currentPrimaryTeam, setCurrentPrimaryTeam] = useState('');
    const [dropdownPrimaryTeam, setDropdownPrimaryTeam] = useState({ id: '', value: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [primaryTicketNumber, setPrimaryTicketNumber] = useState('');
    const [teamOptions, setTeamOptions] = useState([]);

    useEffect(() => {
        if (!isOpen) return;

        setIsLoading(true);
        setIsError(false);

        const fetchCurrentPrimaryTeam = async () => {
            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/getPrimaryTeam?id=${ticketId}`);
                const result = await response.json();
                if (result.success) {
                    setCurrentPrimaryTeam(result.team.name);
                    setPrimaryTicketNumber(result.team.ticketNumber);
                } else {
                    setIsError(true);
                }
            } catch (error) {
                setIsError(true);
            }
        };

        const fetchTeamOptions = async () => {
            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/teams/get`);
                const result = await response.json();
                if (result.success) {
                    const formattedTeams = result.teams.map((team: any) => ({ id: team._id, value: team.name }));
                    setTeamOptions(formattedTeams);
                } else {
                    setIsError(true);
                }
            } catch (error) {
                setIsError(true);
            }
        }

        Promise.all([fetchCurrentPrimaryTeam(), fetchTeamOptions()]).finally(() => {
            setIsLoading(false);
        });
    }, [ticketId, isOpen]);

    const handleSave = async (): Promise<{ success: boolean }> => {
        if (!dropdownPrimaryTeam.id) {
            return { success: false };
        }

        setIsSaving(true);
        setIsError(false);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/tickets/transfer?id=${ticketId}&teamId=${dropdownPrimaryTeam.id}`, {
                method: 'PUT',
            });
            const result = await response.json();
            if (result.success) {
                setCurrentPrimaryTeam(dropdownPrimaryTeam.value);
                setDropdownPrimaryTeam({ id: '', value: '' });
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
        setDropdownPrimaryTeam({ id: e.id, value: e.value });
    };

    return {
        isLoading,
        isError,
        isSaving,
        currentPrimaryTeam,
        dropdownPrimaryTeam,
        handleSave,
        handleOnSelect,
        primaryTicketNumber,
        teamOptions,
    };
};

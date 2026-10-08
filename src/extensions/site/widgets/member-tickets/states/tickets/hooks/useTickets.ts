import { useState, useEffect } from 'react';
import { httpClient } from '@wix/essentials';

export const useTickets = () => {
    const [tickets, setTickets] = useState<any[]>([]);
    const [isTicketsLoading, setIsTicketsLoading] = useState<boolean>(true);

    useEffect(() => {
        const controller = new AbortController();

        const fetchTickets = async () => {
            setIsTicketsLoading(true);
            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await httpClient.fetchWithAuth(
                    `${baseApiUrl}/api/widget/tickets/get`,
                    { signal: controller.signal }
                );
                if (response.ok) {
                    const data = await response.json();
                    setTickets(data.tickets);
                } else {
                    console.error('Failed to fetch tickets:', response.statusText);
                }
            } catch (error) {
                if ((error as any).name !== 'AbortError') {
                    console.error('Error fetching tickets:', error);
                }
            } finally {
                setIsTicketsLoading(false);

            }
        };

        fetchTickets();

        return () => controller.abort();
    }, []);

    return { tickets, isTicketsLoading };
};
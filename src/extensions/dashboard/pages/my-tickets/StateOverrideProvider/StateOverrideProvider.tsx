import { dashboard } from '@wix/dashboard';
import { useEffect } from 'react';
import { clearMyTicketsAgentSession } from '../auth/myTicketsFetchWithAuth';
interface StateOverrideProviderProps {
    children: React.ReactNode;
    onStateOverride: (stateId: string) => void;
    viewTicketOverrideTicketId: (ticketId: string | null) => void;
}

const StateOverrideProvider = ({ children, onStateOverride, viewTicketOverrideTicketId }: StateOverrideProviderProps) => {
    useEffect(() => {
        const observer = dashboard.observeState((componentParams: any) => {
            const currentUrl = componentParams?.location?.search;
            const formattedUrl = new URL(currentUrl || '', 'https://example.com');
            const overrideState = formattedUrl.searchParams.get('stateOverride');
            if (overrideState) {
                if (overrideState === 'login') {
                    clearMyTicketsAgentSession();
                    onStateOverride('login');
                    return;
                }

                onStateOverride(overrideState);
                if (overrideState === 'view-tickets') {
                    const ticketId = formattedUrl.searchParams.get('ticketId');
                    viewTicketOverrideTicketId(ticketId);
                }
            }
        });
        return () => observer.disconnect();
    }, [onStateOverride, viewTicketOverrideTicketId]);
    return (
        <>
            { children }
        </>
    )
}

export default StateOverrideProvider;

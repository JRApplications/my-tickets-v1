import { dashboard } from '@wix/dashboard';
import { useEffect } from 'react';
interface StateOverrideProviderProps {
    children: React.ReactNode;
    onStateOverride: (stateId: string) => void;
    viewTicketOverrideTicketId: (ticketId: string | null) => void;
}

const StateOverrideProvider = ({ children, onStateOverride, viewTicketOverrideTicketId }: StateOverrideProviderProps) => {
    useEffect(() => {
        dashboard.observeState((componentParams: any) => {
            const currentUrl = componentParams?.location.search;
            const formattedUrl = new URL(currentUrl, 'https://example.com');
            const isOverrideState = formattedUrl.search.includes('stateOverride');
            if (isOverrideState) {
                const overrideState = formattedUrl.searchParams.get('stateOverride');
                onStateOverride(overrideState || '');
                if (overrideState === 'view-tickets') {
                    const ticketId = formattedUrl.searchParams.get('ticketId');
                    viewTicketOverrideTicketId(ticketId);;
                }
            }
        });
    }, []);
    return (
        <>
            { children }
        </>
    )
}

export default StateOverrideProvider;
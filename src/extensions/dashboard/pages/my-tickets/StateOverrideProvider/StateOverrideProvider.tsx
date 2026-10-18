import { dashboard } from '@wix/dashboard';
import { useEffect, useRef } from 'react';
import { clearMyTicketsAgentSession } from '../auth/myTicketsFetchWithAuth';

const LOGIN_OVERRIDE_CONSUMED_KEY = 'my-tickets-login-override-consumed';
interface StateOverrideProviderProps {
    children: React.ReactNode;
    onStateOverride: (stateId: string) => void;
    viewTicketOverrideTicketId: (ticketId: string | null) => void;
}

const StateOverrideProvider = ({ children, onStateOverride, viewTicketOverrideTicketId }: StateOverrideProviderProps) => {
    const loginOverrideHandled = useRef(false);

    useEffect(() => {
        const observer = dashboard.observeState((componentParams: any) => {
            const currentUrl = componentParams?.location?.search;
            const formattedUrl = new URL(currentUrl || '', 'https://example.com');
            const overrideState = formattedUrl.searchParams.get('stateOverride');
            if (overrideState !== 'login') {
                loginOverrideHandled.current = false;
                sessionStorage.removeItem(LOGIN_OVERRIDE_CONSUMED_KEY);
            }
            if (overrideState) {
                if (overrideState === 'login') {
                    if (loginOverrideHandled.current || sessionStorage.getItem(LOGIN_OVERRIDE_CONSUMED_KEY) === 'true') return;
                    loginOverrideHandled.current = true;
                    sessionStorage.setItem(LOGIN_OVERRIDE_CONSUMED_KEY, 'true');
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

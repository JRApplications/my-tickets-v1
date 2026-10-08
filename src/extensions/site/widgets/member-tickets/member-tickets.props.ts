import { useState } from 'react';

const [currentState, setCurrentState] = useState<'loading' | 'noTickets' | 'selectedTicketLoading' | 'selectedTicket'  | 'tickets'>('tickets');

export type MemberTicketsProps = {
  id: string;
  className?: string;
  state?: typeof currentState;
  setState?: typeof setCurrentState;
};

export const defaultProps = {
  state: 'tickets',
} as const satisfies Omit<MemberTicketsProps, 'id' | 'className'>;

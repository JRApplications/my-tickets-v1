import { useState } from 'react';
import type { MemberTicketsDesignElement } from '../../member-tickets-embed-script-config.types';

const [currentState, setCurrentState] = useState<'loading' | 'noTickets' | 'selectedTicketLoading' | 'selectedTicket'  | 'tickets'>('tickets');

export type MemberTicketsProps = {
  id: string;
  className?: string;
  state?: typeof currentState;
  setState?: typeof setCurrentState;
  selectedDesignElement?: { element: MemberTicketsDesignElement; id: string } | null;
  onDesignElementSelect?: (selection: { element: MemberTicketsDesignElement; id: string }) => void;
};

export const defaultProps = {
  state: 'tickets',
} as const satisfies Omit<MemberTicketsProps, 'id' | 'className'>;

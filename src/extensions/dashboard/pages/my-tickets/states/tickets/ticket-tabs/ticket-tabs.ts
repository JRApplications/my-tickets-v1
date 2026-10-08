import { useEffect, useState } from 'react';

interface Ticket {
    _id: string;
    ticketId: string;
}

export const useTicketTabs = (
    onSelect?: (ticketId: string | null) => void,
    currentTicketId?: string,
    currentTicketDisplayId?: string,
) => {
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
        currentTicketId ?? null,
    );

    const [tickets, setTickets] = useState<Ticket[]>(
        currentTicketId && currentTicketDisplayId
            ? [
                  {
                      _id: currentTicketId,
                      ticketId: currentTicketDisplayId,
                  },
              ]
            : [],
    );

    useEffect(() => {
        if (!currentTicketId) {
            setSelectedTicketId(null);
            setTickets([]);
            return;
        }

        setTickets((prev) => {
            const existing = prev.find(
                (ticket) => ticket._id === currentTicketId,
            );

            if (existing) {
                // Update the label once the ticket number loads.
                if (
                    currentTicketDisplayId &&
                    existing.ticketId !== currentTicketDisplayId
                ) {
                    return prev.map((ticket) =>
                        ticket._id === currentTicketId
                            ? {
                                  ...ticket,
                                  ticketId: currentTicketDisplayId,
                              }
                            : ticket,
                    );
                }

                return prev;
            }

            return [
                ...prev,
                {
                    _id: currentTicketId,
                    ticketId: currentTicketDisplayId ?? '...',
                },
            ];
        });

        setSelectedTicketId(currentTicketId);
    }, [currentTicketId, currentTicketDisplayId]);

    const onTicketRemove = (_id: string) => {
        setTickets((prevTickets) => {
            const removeIndex = prevTickets.findIndex(
                (ticket) => ticket._id === _id,
            );

            const nextTickets = prevTickets.filter(
                (ticket) => ticket._id !== _id,
            );

            if (selectedTicketId === _id) {
                const fallback =
                    nextTickets[removeIndex] ??
                    nextTickets[removeIndex - 1] ??
                    null;

                setSelectedTicketId(fallback?._id ?? null);

                onSelect?.(fallback?._id ?? null);
            }

            return nextTickets;
        });
    };

    const onSelectedTab = (_id: string) => {
        setSelectedTicketId(_id);
        onSelect?.(_id);
    };

    return {
        selectedTicketId,
        setSelectedTicketId,
        tickets,
        onTicketRemove,
        onSelectedTab,
    };
};
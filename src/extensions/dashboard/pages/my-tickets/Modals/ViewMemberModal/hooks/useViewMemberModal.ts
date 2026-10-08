import { useEffect, useState } from "react";
import { myTicketsFetchWithAuth } from '../../../auth/myTicketsFetchWithAuth';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';

interface AccordionItem {
    id: string | number;
    appId: string;
    title: string;
    subtitle: string;
}

export const useViewMemberModal = (memberId: string, isOpen: boolean) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [member, setMember] = useState<any>(null);
    const [tickets, setTickets] = useState<AccordionItem[]>([]);
    const [storeOrders, setStoreOrders] = useState<AccordionItem[]>([]);
    const [pricingPlanOrders, setPricingPlanOrders] = useState<AccordionItem[]>([]);
    const [bookings, setBookings] = useState<AccordionItem[]>([]);
    const [isBlockingOrUnblocking, setIsBlockingOrUnblocking] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        let isCurrentRequest = true;

        const fetchMemberDetails = async () => {
            try {
                setIsLoading(true);
                setIsError(false);
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/members/viewMember?id=${memberId}`);
                const result = await response.json();
                if (!isCurrentRequest) return;
                if (result.success) {
                    setMember(result.memberData.member);
                    setTickets(result.memberData.tickets);
                    setStoreOrders(result.memberData.storeOrders);
                    setPricingPlanOrders(result.memberData.pricingPlanSubscriptions);
                    setBookings(result.memberData.bookings);
                } else {
                    setIsError(true);
                }
            } catch (error) {
                if (!isCurrentRequest) return;
                console.error("Error fetching member details:", error);
                setIsError(true);
            } finally {
                if (isCurrentRequest) {
                    setIsLoading(false);
                }
            }

        };

        fetchMemberDetails();

        return () => {
            isCurrentRequest = false;
        };
    }, [memberId, isOpen]);

    const handleBlockMember = async () => {
        try {
            setIsBlockingOrUnblocking(true);
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/members/blockMember?id=${memberId}`, {
                method: 'POST',
            });
            const result = await response.json();
            if (result.success) {
                setMember((prev: any) => ({ ...prev, status: 'BLOCKED' }));
            }
        } catch (error) {
            ShowToast({message:"Failed to block member.", type: "error" });
        } finally {
            setIsBlockingOrUnblocking(false);
        }
    };

    const handleUnblockMember = async () => {
        try {
            setIsBlockingOrUnblocking(true);
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/members/unblockMember?id=${memberId}`, {
                method: 'POST',
            });
            const result = await response.json();
            if (result.success) {
                setMember((prev: any) => ({ ...prev, status: 'APPROVED' }));
            }
        } catch (error) {
            ShowToast({message:"Failed to unblock member.", type: "error" });
        } finally {
            setIsBlockingOrUnblocking(false);
        }
    };

    return {
        member,
        tickets,
        storeOrders,
        pricingPlanOrders,
        bookings,
        isLoading,
        isError,
        handleBlockMember,
        handleUnblockMember,
        isBlockingOrUnblocking,
    };
};

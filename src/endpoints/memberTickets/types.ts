export interface MemberTicket {
    _id: string;
    subject: string;
    status: string;
    primaryTicketNumber?: string;
    ticketId?: string;
    submittedDate?: string;
    _createdDate?: string;
    /** Epoch ms of the expected first reply. Present only when the owner enabled customer ETAs. */
    expectedResponseBy?: number;
}

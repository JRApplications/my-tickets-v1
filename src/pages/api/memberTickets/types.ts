export interface MemberTicket {
    _id: string;
    subject: string;
    status: string;
    primaryTicketNumber: string;
    _createdDate: string;
    /** Epoch ms of the expected first reply. Present only when the owner enabled customer ETAs. */
    expectedResponseBy?: number;
}

export interface PageInfo {
    hasNext: boolean;
    nextCursor: string | null;
}

export interface FetchMemberTicketsPageResult {
    items: MemberTicket[];
    pageInfo: PageInfo;
}

export interface MemberTicketDataItem {
    id: string;
    data: Pick<MemberTicket, 'subject' | 'status' | 'primaryTicketNumber' | '_createdDate'>;
}

export const PAGE_SIZE = 1000;
export const CACHE_TTL_MS = 30_000;

export interface CacheEntry {
    tickets: MemberTicket[];
    expiresAt: number;
}
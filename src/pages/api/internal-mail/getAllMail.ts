import type { APIRoute } from "astro";
import { checkPermission } from '../auth/checkPermission';
import { generateElevatedAuthToken } from '../auth/generateElevatedAuthToken';
import { captureError } from '../reportError';
import { CollectionIds, type InternalMail } from "@jrapps/my_tickets_common_types";
    
import { isSystemAdmin } from '../auth/system-admin';

interface PageInfo {
    hasNext: boolean;
    nextCursor: string | null;
}

interface FetchPageResult {
    items: InternalMail[];
    pageInfo: PageInfo;
    allMailCount: number;
    unreadMailCount: number;
    flaggedMailCount: number;
}

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const identity = locals.myTicketsIdentity;
        const user = identity?.agentId ?? null;
        const teamId = identity && !isSystemAdmin(identity.agentId) ? identity.teamId : null;
        const authToken = request.headers.get('Authorization');
        if (!user) {
            status = 400;
            throw new Error('Agent ID is required.');
        }
        const checkPermission1 = await checkPermission(authToken, ["ADMIN", "USER"]);
        if (!checkPermission1) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        
        const elevatedAuthToken = await generateElevatedAuthToken(authToken);
        const { items: formattedItems, allMailCount, unreadMailCount, flaggedMailCount } = await fetchAllMail(elevatedAuthToken, user, teamId);

        return new Response(JSON.stringify({ items: formattedItems, allMailCount, unreadMailCount, flaggedMailCount }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error fetching all mail' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

async function fetchPage(accessToken: string | null, cursor: string | null, user: string, teamId: string | null): Promise<FetchPageResult> {
    const endpoint = "https://www.wixapis.com/graphql/alpha";

    const query = `
    query GetTeams($dataCollectionId: String!, $filter: JSON, $cursor: String) {
        dataItemsV2DataItems(queryInput: {
            dataCollectionId: $dataCollectionId,
            query: {
                fields: ["_id", "_updatedDate", "metaData.agentFrom", "metaData.agentsTo", "metaData.teamsTo", "metaData.subject", "metaData.agentsRead", "metaData.agentsFlagged"],
                filter: $filter,
                cursorPaging: {
                    limit: 1000
                    cursor: $cursor
                }
            }
        }) {
            items {
                id
                data
            }
            pageInfo {
                hasNext
                nextCursor
            }
        }
    }
`;

    const variables = {
        dataCollectionId: CollectionIds.CHAT_CONVERSATIONS,
        filter: {
            "channel": { $eq: "INTERNAL_MAIL" },
            "metaData.agentsDeleted": { $not: { $hasSome: [user] } },
            ...(user === "system_admin" ? {} : {
                "$or": [
                    { "metaData.agentsTo": { $hasSome: [user] } },
                    ...(teamId ? [{ "metaData.teamsTo": { $hasSome: [teamId] } }] : [])
                ]
            })
        },
        cursor: cursor ?? null
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const { items, pageInfo } = result.data.dataItemsV2DataItems;

    let allMailCount = 0;
    let unreadMailCount = 0;
    let flaggedMailCount = 0;

    const formattedItems = items.map((item: any) => {
        const hasRead = item.data.metaData.agentsRead.includes(user);
        const isFlagged = item.data.metaData.agentsFlagged.includes(user);

        allMailCount++;
        if (!hasRead) unreadMailCount++;
        if (isFlagged) flaggedMailCount++;

        return {
            _id: item.data._id,
            from: item.data.metaData.agentFrom.name,
            email: item.data.metaData.agentFrom.email || '',
            originalSent: item.data.metaData.agentFrom._id === user,
            to: item.data.metaData.agentsTo,
            subject: item.data.metaData.subject,
            hasRead,
            isFlagged,
            timestamp: item.data._updatedDate.$date
        };
    });

    return { items: formattedItems, allMailCount, unreadMailCount, flaggedMailCount, pageInfo };
}

async function fetchAllMail(accessToken: string | null, user: string, teamId: string | null): Promise<{ items: InternalMail[], allMailCount: number, unreadMailCount: number, flaggedMailCount: number }> {
    const firstPage = await fetchPage(accessToken, null, user, teamId);
    const allItems: InternalMail[] = [...firstPage.items];

    let allMailCount = firstPage.allMailCount;
    let unreadMailCount = firstPage.unreadMailCount;
    let flaggedMailCount = firstPage.flaggedMailCount;

    let cursor = firstPage.pageInfo.hasNext ? firstPage.pageInfo.nextCursor : null;

    while (cursor !== null) {
        const { items, pageInfo, allMailCount: pageAll, unreadMailCount: pageUnread, flaggedMailCount: pageFlagged } = await fetchPage(accessToken, cursor, user, teamId);
        allItems.push(...items);
        allMailCount += pageAll;
        unreadMailCount += pageUnread;
        flaggedMailCount += pageFlagged;
        cursor = pageInfo.hasNext ? pageInfo.nextCursor : null;
    }

    return { items: allItems, allMailCount, unreadMailCount, flaggedMailCount };
}

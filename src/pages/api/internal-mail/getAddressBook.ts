import type { APIRoute } from 'astro';
import { checkPermission } from '../auth/checkPermission';
import { generateElevatedAuthToken } from '../auth/generateElevatedAuthToken';
import { captureError } from '../reportError';
import { CollectionIds, type Agent, type Team } from '@jrapps/my_tickets_common_types';

interface AgentDataItem {
    id: string;
    data: Pick<Agent, 'email' | 'name' >;
}

interface FetchAgentPageResult {
    items: Agent[];
    pageInfo: PageInfo;
}

interface TeamDataItem {
    id: string;
    data: Pick<Team, 'name' | 'email'>;
}

interface PageInfo {
    hasNext: boolean;
    nextCursor: string | null;
}

interface FetchTeamPageResult {
    items: Team[];
    pageInfo: PageInfo;
}

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const authToken = request.headers.get('Authorization');
        const checkPermission1 = await checkPermission(authToken, ["ADMIN", "USER"]);
        if (!checkPermission1) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        
        const elevatedAuthToken = await generateElevatedAuthToken(authToken);
        const [agents, teams] = await Promise.all([fetchAllAgents(elevatedAuthToken), fetchAllTeams(elevatedAuthToken)]);
        const addressBook: (Agent | Team)[] = [...agents, ...teams];
        return new Response(JSON.stringify(addressBook), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error fetching address book' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
}

async function fetchAgentPage(accessToken: string | null, cursor: string | null): Promise<FetchAgentPageResult> {
    const endpoint = "https://www.wixapis.com/graphql/alpha";

    const query = `
        query GetAgents($dataCollectionId: String!) {
            dataItemsV2DataItems(queryInput: {
                dataCollectionId: $dataCollectionId,
                query: {
                    cursorPaging: {
                        limit: 1000
                        ${cursor ? `, cursor: "${cursor}"` : ""}
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

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ query, variables: { dataCollectionId: CollectionIds.AGENTS } })
    });

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const { items, pageInfo } = result.data.dataItemsV2DataItems;

    const mapped: Agent[] = items.map((item: AgentDataItem) => ({
        _id: item.id,
        email: item.data.email,
        name: item.data.name,
        isTeam: false,
        isAgent: true
    }));

    return { items: mapped, pageInfo };
}

async function fetchAllAgents(accessToken: string | null): Promise<Agent[]> {
    const firstPage = await fetchAgentPage(accessToken, null);
    const allItems: Agent[] = [...firstPage.items];
    let cursor = firstPage.pageInfo.hasNext ? firstPage.pageInfo.nextCursor : null;

    while (cursor !== null) {
        const { items, pageInfo } = await fetchAgentPage(accessToken, cursor);
        allItems.push(...items);
        cursor = pageInfo.hasNext ? pageInfo.nextCursor : null;
    }

    return allItems;
}

async function fetchTeamsPage(accessToken: string | null, cursor: string | null): Promise<FetchTeamPageResult> {
    const endpoint = "https://www.wixapis.com/graphql/alpha";

    const query = `
        query GetTeams($dataCollectionId: String!) {
            dataItemsV2DataItems(queryInput: {
                dataCollectionId: $dataCollectionId,
                query: {
                    cursorPaging: {
                        limit: 1000
                        ${cursor ? `, cursor: "${cursor}"` : ""}
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

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ query, variables: { dataCollectionId: CollectionIds.TEAMS } })
    });

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const { items, pageInfo } = result.data.dataItemsV2DataItems;

    const mapped: Team[] = items.map((item: TeamDataItem) => ({
        _id: item.id,
        name: item.data.name,
        email: item.data.email,
        isAgent: false,
        isTeam: true
    }));

    return { items: mapped, pageInfo };
}

async function fetchAllTeams(accessToken: string | null): Promise<Team[]> {
    const firstPage = await fetchTeamsPage(accessToken, null);
    const allItems: Team[] = [...firstPage.items];
    let cursor = firstPage.pageInfo.hasNext ? firstPage.pageInfo.nextCursor : null;

    while (cursor !== null) {
        const { items, pageInfo } = await fetchTeamsPage(accessToken, cursor);
        allItems.push(...items);
        cursor = pageInfo.hasNext ? pageInfo.nextCursor : null;
    }

    return allItems;
}

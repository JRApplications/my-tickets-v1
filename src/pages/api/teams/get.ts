import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { generateElevatedAuthToken } from '../auth/generateElevatedAuthToken';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { CollectionIds, type Team } from '@jrapps/my_tickets_common_types';

interface TeamDataItem {
    id: string;
    data: Pick<Team, 'name' | 'description' | 'department' | 'teamPictureUrl' | 'email'>;
}

interface PageInfo {
    hasNext: boolean;
    nextCursor: string | null;
}

interface FetchPageResult {
    items: Team[];
    pageInfo: PageInfo;
}

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    const url = new URL(request.url);
    const teamId = url.searchParams.get("id");
    try {
        const authToken = request.headers.get("Authorization");
        const [elevatedAuthToken, checkPermissionStatus] = await Promise.all([
            generateElevatedAuthToken(authToken),
            checkPermission(authToken, ['ADMIN', 'USER'])
        ]);

        if (!checkPermissionStatus) {
            status = 403;
            throw new Error("Insufficient permissions");
        }
        if (teamId) {
            const team = await fetchTeam(elevatedAuthToken, teamId);
            return new Response(JSON.stringify({ success: true, team }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } else {
            const teams = await fetchAllTeams(elevatedAuthToken);

            return new Response(JSON.stringify({
                success: true,
                teams: teams as Partial<Team>[]
                // .filter(team => team.name !== "DEFAULT_ADMIN")
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Failed to fetch teams' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

async function fetchPage(accessToken: string | null, cursor: string | null): Promise<FetchPageResult> {
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
        description: item.data.description,
        department: item.data.department || '',
        email: item.data.email,
        teamPictureUrl: item.data.teamPictureUrl
    }));

    return { items: mapped, pageInfo };
}

async function fetchAllTeams(accessToken: string | null): Promise<Team[]> {
    const firstPage = await fetchPage(accessToken, null);
    const allItems: Team[] = [...firstPage.items];
    let cursor = firstPage.pageInfo.hasNext ? firstPage.pageInfo.nextCursor : null;

    while (cursor !== null) {
        const { items, pageInfo } = await fetchPage(accessToken, cursor);
        allItems.push(...items);
        cursor = pageInfo.hasNext ? pageInfo.nextCursor : null;
    }

    return allItems;
}

// @ts-ignore

async function fetchTeam(accessToken: string | null, teamId: string): Promise<Team> {
    // const endpoint = "https://www.wixapis.com/graphql/alpha";

    // const query = `
    //     query GetTeam($queryInput: DataItemsV2DataItemRequestInput) {
    //         dataItemsV2DataItem(queryInput: $queryInput) {
    //             id
    //             data
    //         }
    //     }
    // `;

    // const response = await fetch(endpoint, {
    //     method: "POST",
    //     headers: {
    //         "Content-Type": "application/json",
    //         "Authorization": `Bearer ${accessToken}`
    //     },
    //     body: JSON.stringify({
    //         query,
    //         variables: {
    //             queryInput: {
    //                 dataCollectionId: "@joshrobertswebsites/my-tickets/teams",
    //                 id: teamId,
    //             }
    //         }
    //     })
    // });

    // if (!response.ok) {
    //     throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    // }

    // const result = await response.json();

    // if (result.errors) {
    //     throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    // }

    // const items = result.data.dataItemsV2DataItem;

    // if (!items.length) {
    //     throw new Error(`Team not found: ${teamId}`);
    // }

    // const item = items[0];

    // return {
    //     _id: item.id,
    //     name: item.data.name,
    //     description: item.data.description,
    //     teamPictureUrl: item.data.teamPictureUrl
    // };

    const team = await items.get(CollectionIds.TEAMS, teamId) as Team | null;
    if (!team) {
        throw new Error('Team not found');
    }
    return team;
}

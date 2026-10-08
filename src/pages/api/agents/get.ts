import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { generateElevatedAuthToken } from '../auth/generateElevatedAuthToken';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { CollectionIds, type Agent } from '@jrapps/my_tickets_common_types';

interface UserDataItem {
    id: string;
    data: Pick<Agent, 'userId' | 'email' | 'name' | 'role' | 'team' | 'profilePictureUrl' | 'assignedTickets'>;
}

interface PageInfo {
    hasNext: boolean;
    nextCursor: string | null;
}

interface FetchPageResult {
    items: Agent[];
    pageInfo: PageInfo;
}

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    const url = new URL(request.url);
    const queryId = url.searchParams.get("id");
    try {
        const authToken = request.headers.get("Authorization");
        const [elevatedAuthToken, checkPermissionStatus] = await Promise.all([
            generateElevatedAuthToken(authToken),
            checkPermission(authToken, ['ADMIN', 'USER'])
        ]);

        if (!checkPermissionStatus) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        if (queryId) {
            const user = await fetchUser(elevatedAuthToken, queryId);
            return new Response(JSON.stringify({ success: true, user }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } else {
            const users = await fetchAllUsers(elevatedAuthToken);

            return new Response(JSON.stringify({
                success: true,
                agents: users.filter(user => user.name !== "DEFAULT_ADMIN") as Partial<Agent>[]
            }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error fetching users' }), {
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
                referencedItemOptions: [{ fieldName: "team", limit: 1 }, { fieldName: "role", limit: 1 }],
                query: {
                    fields: ["name", "email", "role", "team"],
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

    const mapped: Agent[] = items.map((item: UserDataItem) => ({
        _id: item.id,
        email: item.data.email,
        name: item.data.name,
        role: item.data?.role?.roleName as string && item.data.role.roleName !== 'DEFAULT_ADMIN' ? { name: item.data.role.roleName, _id: item.data.role._id } : { name: '', _id: '' },
        team: item.data?.team?.name && item.data.team.name !== 'DEFAULT_ADMIN' ? { name: item.data.team.name, _id: item.data.team._id } : { name: '', _id: '' },
        profilePictureUrl: item.data.profilePictureUrl,
    }));

    return { items: mapped, pageInfo };
}

async function fetchAllUsers(accessToken: string | null): Promise<Agent[]> {
    const firstPage = await fetchPage(accessToken, null);
    const allItems: Agent[] = [...firstPage.items];
    let cursor = firstPage.pageInfo.hasNext ? firstPage.pageInfo.nextCursor : null;

    while (cursor !== null) {
        const { items, pageInfo } = await fetchPage(accessToken, cursor);
        allItems.push(...items);
        cursor = pageInfo.hasNext ? pageInfo.nextCursor : null;
    }

    return allItems;
}


async function fetchUser(accessToken: string | null, queryId: string): Promise<Agent> {
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
    //                 dataCollectionId: "@joshrobertswebsites/my-tickets/users",
    //                 id: queryId,
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
    //     throw new Error(`User not found: ${queryId}`);
    // }

    // const item = items[0];

    // return {
    //     _id: item.id,
    //     name: item.data.name,
    //     description: item.data.description,
    //     teamPictureUrl: item.data.teamPictureUrl
    // };

    const user = await items.get(CollectionIds.AGENTS, queryId, { includeReferences: [{ field: "team", limit: 1 }, { field: 'role', limit: 1}], fields: ['email', 'name', 'phoneNumber', 'profilePictureUrl', 'role._id', 'role.roleName', 'team.name', 'team._id', '_id'] });
    const formattedUser = {
        ...user,
        role: user?.role && user?.role?.roleName !== 'DEFAULT_ADMIN' ? { _id: user.role._id, roleName: user.role.roleName } : { _id: '', roleName: '' },
        team: user?.team && user?.team?.name !== 'DEFAULT_ADMIN' ? { _id: user.team._id, name: user.team.name } : { _id: '', name: '' }
    }
    if (!user) {
        throw new Error(`User not found: ${queryId}`);
    }
    const { userId, ...safeUser } = formattedUser as any;
    return safeUser as Agent;
}

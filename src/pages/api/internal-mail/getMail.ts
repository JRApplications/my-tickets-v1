import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { SYSTEM_ADMIN_ID, isSystemAdmin } from '../auth/system-admin';

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const mailId = url.searchParams.get('mailId');
        const agentId = locals.myTicketsIdentity?.agentId;
        const authToken = request.headers.get('Authorization');
        const checkPermission1 = await checkPermission(authToken, ["ADMIN", "USER"]);
        if (!checkPermission1) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        if (!mailId) {
            status = 400;
            throw new Error('Missing mailId parameter');
        }

        if (!agentId) {
            status = 400;
            throw new Error('Missing agentId parameter');
        }

        const elevatedGet = auth.elevate(items.get);
        const mailDetails = await elevatedGet(CollectionIds.CHAT_CONVERSATIONS, mailId);
        const systemAdmin = isSystemAdmin(agentId);
        const agent = systemAdmin ? { _id: SYSTEM_ADMIN_ID, team: SYSTEM_ADMIN_ID } : await elevatedGet(CollectionIds.AGENTS, agentId);
        const agentTeam = systemAdmin ? { _id: SYSTEM_ADMIN_ID } : await elevatedGet(CollectionIds.TEAMS, agent?.team);
        if (!agent) {
            status = 404;
            throw new Error('Agent not found');
        }

        if (!agentTeam) {
            status = 404;
            throw new Error('Agent team not found');
        }

        // an agent may view the mail if they're an individual recipient or their team was addressed
        const isRecipient = systemAdmin || (mailDetails?.metaData?.agentsTo ?? []).includes(agentId)
            || (mailDetails?.metaData?.teamsTo ?? []).includes(agentTeam._id);
        if (mailDetails && !isRecipient) {
            status = 403;
            throw new Error('Insufficient permissions to access this mail');
        }
        // const elevatedAuthToken = await generateElevatedAuthToken(authToken);
        // const mailDetails = await testGet(mailId, elevatedAuthToken);

        if (!mailDetails) {
            status = 404;
            throw new Error('Mail not found');
        }

        return new Response(JSON.stringify({ mail: mailDetails }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error fetching mail details' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

// @ts-ignore
async function testGet(mailId: string, accessToken: string | null) {
    const endpoint = "https://www.wixapis.com/graphql/alpha";

    const query = `
        query GetTeam($id: ID!) {
            dataItemsV2DataItem(queryInput: {
                dataCollectionId: $dataCollectionId,
                id: $id
            }) {
                id
                data
            }
        }
    `;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            query,
            variables: {
                dataCollectionId: CollectionIds.CHAT_CONVERSATIONS,
                id: mailId
            }
        })
    });

//     const introspectQuery = `
//     query {
//         __type(name: "DataItemsV2DataItemRequestInput") {
//             inputFields {
//                 name
//                 type {
//                     name
//                     kind
//                 }
//             }
//         }
//     }
// `;

//     const response = await fetch(endpoint, {
//         method: "POST",
//         headers: {
//             "Content-Type": "application/json",
//             "Authorization": `Bearer ${accessToken}`
//         },
//         body: JSON.stringify({
//             query: introspectQuery
//         })
//     });

//     const data = await response.json();
//     console.log(JSON.stringify(data, null, 2));

    if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data.dataItemsV2DataItem;
}

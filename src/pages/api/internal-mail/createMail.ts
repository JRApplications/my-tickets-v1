import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { v4 as uuidv4 } from 'uuid';
import { publisher } from '@wix/realtime';
import { generateElevatedAuthToken } from '../auth/generateElevatedAuthToken';
import { checkPermission } from '../auth/checkPermission';
import { captureError } from '../reportError';
import { type Notification as NotificationType, CollectionIds } from '@jrapps/my_tickets_common_types';
import { randomUUID } from 'crypto';
import { SYSTEM_ADMIN_EMAIL, SYSTEM_ADMIN_ID, SYSTEM_ADMIN_NAME, isSystemAdmin } from '../auth/system-admin';

interface AttachmentProps {
    id: string;
    name: string;
    url: string;
}

interface Payload {
    message: string;
    subject: string;
    attachments: AttachmentProps[];
    agentsTo: string[];
    teamsTo: string[];
    agentId: string
}

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const data = await request.json();
        const { message, subject, attachments, agentsTo, teamsTo }: Payload = data;
        const agentId = locals.myTicketsIdentity?.agentId;
        if (!agentId) {
            status = 401;
            throw new Error('Authenticated agent identity is required');
        }
        const authToken = request.headers.get('Authorization');
        const checkPermission1 = await checkPermission(authToken, ["ADMIN", "USER"]);
        if (!checkPermission1) {
            status = 403;
            throw new Error('Insufficient permissions');
        }
        const elevatedGet = auth.elevate(items.get);
        const agent = isSystemAdmin(agentId)
            ? { _id: SYSTEM_ADMIN_ID, name: SYSTEM_ADMIN_NAME, email: SYSTEM_ADMIN_EMAIL, team: { _id: SYSTEM_ADMIN_ID } }
            : await elevatedGet(CollectionIds.AGENTS, agentId, { includeReferences: [{ field: "team", limit: 1 }] });
        if (!agent) {
            status = 404;
            throw new Error('Agent not found.');
        }
        const toCreate = {
            "metaData": {
                "agentFrom": {
                    "name": agent.name,
                    "email": agent.email,
                    "_id": agent._id,
                    "teamId": agent.team._id,
                    "timestamp": Date.now()
                },
                // include the sender so the thread stays visible in their own mailbox
                "agentsTo": Array.from(new Set([...(agentsTo ?? []), agent._id])),
                "subject": subject,
                "teamsTo": teamsTo,
                "agentsFlagged": [],
                "agentsRead": [agent._id]
            },
            "channel": "INTERNAL_MAIL"
        }

        // const elevatedInsert = await auth.elevate(items.insert);
        // const toInsert = await elevatedInsert('@joshrobertswebsites/my-tickets/chatConversations', toCreate);
        const elevatedAuthToken = await generateElevatedAuthToken(authToken);
        const toInsert = await graphQLInsert(toCreate, elevatedAuthToken);
        if (!toInsert) {
            status = 500;
            throw new Error('Failed to create internal mail');
        }
        const toUpdatePayload = {
            "_id": uuidv4(),
            "mailId": toInsert._id,
            "senderId": agent._id,
            "message": message,
            "attachments": attachments,
            "senderName": agent.name,
            "senderEmail": agent.email,
            "timestamp": Date.now(),
            "teamId": agent.team._id
        }
        const elevatedPatch = auth.elevate(items.patch);
        const toUpdate = await elevatedPatch(CollectionIds.CHAT_CONVERSATIONS, toInsert._id).appendToArray('messages', toUpdatePayload).run();
        if (!toUpdate) {
            status = 500;
            throw new Error('Failed to update internal mail with message');
        }
        // the mail is already saved, so a notification failure must not fail this request
        const notifyIds = [
            ...(toCreate.metaData.agentsTo as string[]).filter((id) => id !== agent._id),
            ...(teamsTo ?? [])
        ];

        try {
            await sendRealtimeUpdate(toInsert._id, notifyIds);
        } catch (notificationError) {
            console.error('Mail was created, but realtime update failed:', notificationError);
        }
        const mentions = getMentions(message);
        if (mentions.length > 0) {
            try {
                await sendRealtimeNotifications(mentions, request.url, authToken, request.headers.get('x-my-tickets-auth') || '');
            } catch (notificationError) {
                console.error('Mail was created, but mention notifications failed:', notificationError);
            }
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error creating internal mail' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
}

const sendRealtimeUpdate = async (mailId: string, toIds: string[]): Promise<void> => {
    if (!mailId || !toIds || toIds.length === 0) {
        return;
    }
    const elevatedPublish = auth.elevate(publisher.publish);
    await Promise.all(
        toIds.map((toId) =>
            elevatedPublish({ name: 'INTERNAL_MAIL', resourceId: toId }, { mailId })
        )
    );
};

const getMentions = (message: string): string[] => {
    const mentionRegex = /\[@\{"name":"([^"]+)","id":"([^"]+)","teamName":"([^"]+)","teamId":"([^"]+)"\}\]/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(message)) !== null) {
        mentions.push(match[2]); // push the id of the mentioned user
    }
    return mentions;
};

const sendRealtimeNotifications = async (mentions: string[], baseUrl: string, auth: any, agentAuthToken: string) => {
    try {
        const notification: NotificationType = { id: randomUUID(), title: `Internal Mail`, subtitle: 'You received a new internal mail that mentions you.' };

        await Promise.all(
            mentions.map(async (toId) => {
                const fetchUrl = new URL(
                    "/api/notifications/sendNotification",
                    baseUrl,
                );
                const response = await fetch(fetchUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `${auth}`,
                        'x-my-tickets-auth': agentAuthToken,
                    },
                    body: JSON.stringify({ agentId: toId, notification })
                });
                if (!response.ok) {
                    throw new Error(`Failed to send notification to agent ${toId}`);
                }
                return response;
            })
        );
    } catch (error) {
        throw error;
    }
};

async function graphQLInsert(toInsert: any, accessToken: string | null) {
    const endpoint = "https://www.wixapis.com/graphql/alpha";

    const query = `
        mutation InsertMail($input: CloudDataDataInsertDataItemRequestInput!) {
            dataItemsV2InsertDataItem(input: $input) {
                dataItem {
                    id,
                    data
                }
            }
        }
    `;

    const variables = {
        input: {
            dataCollectionId: CollectionIds.CHAT_CONVERSATIONS,
            dataItem: {
                data: toInsert
            }
        }
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ query, variables })
    });
    const result = await response.json();
    if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const item = result.data?.dataItemsV2InsertDataItem.dataItem;
    const formattedItem = { _id: item.id, ...item.data };
    return formattedItem;
}

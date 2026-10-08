import type { APIRoute } from 'astro';
import { generateElevatedAuthToken } from '../auth/generateElevatedAuthToken';
import { checkPermission } from '../auth/checkPermission';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { captureError } from '../reportError';

interface ChatConfig {
    _id?: string;
    enableChatQuestions: boolean;
    useAiDirect: boolean;
    chatQuestions: any[];
    availableTeams: Array<{ name: string; _id: string; keywords: string[] }>;
    generalTeamId: string;
    useAiDirectConfig?: string;
    success?: boolean;
    hasPermissions?: boolean;
}

export const GET: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const url = new URL(request.url);
        const dashboard = url.searchParams.get('dashboard') === 'true';
        const authToken = request.headers.get("Authorization");
        const hasPermission = await checkPermission(authToken, ["VISITOR", "MEMBER", "ADMIN", "USER"]);
        if (!hasPermission) {
            status = 403;
            throw new Error("Insufficient permissions");
        }
        const chatConfig = await getConfig(dashboard, authToken);
        if ('success' in chatConfig && !chatConfig.success && !chatConfig.hasPermissions) {
            status = 403;
            throw new Error("Insufficient permissions");
        }
        return new Response(JSON.stringify(chatConfig), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching chat configuration';
        console.error("Error fetching chat configuration:", errorMessage);
        return new Response(JSON.stringify({ "error": errorMessage, requestId }), {
            status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            }
        });
    }
}

const getConfig = async (dashboard: boolean, accessToken: string | null): Promise<ChatConfig & { useAiDirectConfig?: string }> => {
    const defaultConfig = {
        success: true,
        hasPermissions: true,
        chatQuestions: [],
        enableChatQuestions: false,
        useAiDirect: false,
        availableTeams: [],
        generalTeamId: ''
    };

    try {
        const hasPermission = await checkPermission(accessToken, ["ADMIN", "USER"]);
        if (!hasPermission && dashboard === true) {
            // No dashboard permission - return the default shape but flag that
            // permissions are actually missing, rather than always claiming true.
            return { ...defaultConfig, hasPermissions: false };
        }

        const chatConfigInit = await getGraphQLItem(accessToken);
        if (!chatConfigInit) {
            console.error('No chat configuration found, returning default configuration');
            return defaultConfig;
        }

        const chatConfig: ChatConfig = { ...chatConfigInit };

        if (chatConfig.useAiDirect && dashboard === false) {
            const teams = Array.isArray(chatConfig.availableTeams) ? chatConfig.availableTeams : [];
            chatConfig.useAiDirectConfig = teams
                .map((team: any) => `- { name: ${team.name}, _id: "${team._id}" }: ${(team.keywords ?? []).join(', ')}`)
                .join('\n');
        }

        chatConfig.success = true;
        chatConfig.hasPermissions = true;

        return dashboard === true ? ({ data: chatConfig } as any) : chatConfig;
    } catch (error) {
        throw new Error('Failed to get chat configuration : ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}

async function getGraphQLItem(initialAccessToken: string | null): Promise<any | null> {
    try {
        const accessToken = await generateElevatedAuthToken(initialAccessToken);
        const endpoint = "https://www.wixapis.com/graphql/alpha";

        const query = `
        query GetTeams($dataCollectionId: String!) {
            dataItemsV2DataItems(queryInput: {
                dataCollectionId: $dataCollectionId,
                query: {
                    paging: {
                        limit: 1
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
            body: JSON.stringify({ query, variables: { dataCollectionId: CollectionIds.CHAT_WIDGET_CONFIG } })
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        if (result.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
        }

        // Guard every level: result.data, dataItemsV2DataItems, and items can all be
        // missing or empty depending on what the API returns.
        const items = result?.data?.dataItemsV2DataItems?.items;

        if (!Array.isArray(items) || items.length === 0 || !items[0]) {
            // No config exists yet - let the caller decide what the default should be,
            // instead of returning a near-empty object that looks "found".
            return null;
        }

        return { _id: items[0].id, ...(items[0].data ?? {}) };

    } catch (error) {
        throw new Error('Failed to get GraphQL item: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}

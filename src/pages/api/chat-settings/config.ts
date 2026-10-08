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
    businessSupportHours: Array<{ day: string; closed: boolean; startTime: Date | null; endTime: Date | null }>;
}

function validateIncomingConfig(config: unknown): config is ChatConfig {
    if (!config || typeof config !== 'object') {
        return false;
    }
    const cfg = config as Record<string, unknown>;
    if (typeof cfg.enableChatQuestions !== 'boolean') {
        return false;
    }

    if (typeof cfg.useAiDirect !== 'boolean') {
        return false;
    }

    if (!Array.isArray(cfg.chatQuestions)) {
        return false;
    }

    if (!Array.isArray(cfg.availableTeams)) {
        return false;
    }

    if (typeof cfg.generalTeamId !== 'string') {
        return false;
    }

    if (!cfg.availableTeams.every((team: unknown) => {
        const t = team as Record<string, unknown>;
        return typeof t.name === 'string' && typeof t._id === 'string' && Array.isArray(t.keywords);
    })) {
        return false;
    }

    if (cfg.useAiDirect && cfg.availableTeams.length === 0) {
        return false;
    }

    if (!cfg.generalTeamId) {
        return false;
    }

    if (!Array.isArray(cfg.businessSupportHours)) {
        return false;
    }

    if (!cfg.businessSupportHours.every((item: unknown) => {
        const b = item as Record<string, unknown>;
        return typeof b.day === 'string' && typeof b.closed === 'boolean' && ('startTime' in b) && ('endTime' in b);
    })) {
        return false;
    }

    return true;
}

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        let config: ChatConfig;
        try {
            config = await request.json() as ChatConfig;
        } catch {
            status = 400;
            throw new Error('Request body is not valid JSON');
        }

        const authToken = request.headers.get("Authorization");
        const hasPermission = await checkPermission(authToken, ["ADMIN", "USER"]);
        if (!hasPermission) {
            status = 403;
            throw new Error("Insufficient permissions");
        }

        const elevatedAuthToken = await generateElevatedAuthToken(authToken);
        const result = await createOrUpdateConfig(config, elevatedAuthToken);
        return new Response(JSON.stringify({ success: !!result, config: result }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        const errorMessage = error instanceof Error ? error.message : 'An error occurred while saving chat configuration';
        console.error("Error saving chat configuration:", errorMessage);
        return new Response(JSON.stringify({ "error": errorMessage, requestId }), {
            status,
            headers: {
                'Content-Type': 'application/json',
                'x-mytickets-request-id': requestId
            }
        });
    }
}

export const createOrUpdateConfig = async (incomingConfig: ChatConfig, accessToken: string | null): Promise<ChatConfig> => {
    const endpoint = "https://www.wixapis.com/graphql/alpha";
    try {
        if (!validateIncomingConfig(incomingConfig)) {
            throw new Error('Invalid configuration provided');
        }

        const configWithoutId = incomingConfig._id ? { ...incomingConfig, _id: undefined } : incomingConfig;

        const query = `
            mutation UpsertChatConfig($input: CloudDataDataSaveDataItemRequestInput!) {
                dataItemsV2SaveDataItem(input: $input) {
                    action
                    dataItem {
                        id
                        data
                    }
                }
            }
        `;

        const variables = {
            input: {
                dataCollectionId: CollectionIds.CHAT_WIDGET_CONFIG,
                dataItem: {
                    id: incomingConfig._id ?? undefined,
                    dataCollectionId: CollectionIds.CHAT_WIDGET_CONFIG,
                    data: configWithoutId
                }
            }
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

        const item = result?.data?.dataItemsV2SaveDataItem?.dataItem;
        if (!item) {
            throw new Error('GraphQL response did not include the saved data item');
        }

        return { _id: item.id, ...(item.data ?? {}) };

    } catch (error) {
        throw new Error('Failed to create or update chat configuration : ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
}
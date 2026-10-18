const WIX_GRAPHQL_ENDPOINT = 'https://www.wixapis.com/graphql/alpha';

export interface GraphQLDataItem {
    id: string;
    data: Record<string, unknown>;
}

export interface GraphQLDataItemsPage {
    items: GraphQLDataItem[];
    pageInfo: { hasNext: boolean; nextCursor: string | null };
}

/** Fetches one CMS page through Wix's GraphQL data items API. */
export async function fetchTicketItemsPage<TFilter = Record<string, unknown>>(args: {
    accessToken: string;
    dataCollectionId: string;
    fields: readonly string[];
    filter?: TFilter;
    limit: number;
    cursor?: string | null;
    offset?: number;
    sort?: readonly { fieldName: string; order: 'ASC' | 'DESC' }[];
}): Promise<GraphQLDataItemsPage> {
    const usesOffsetPaging = args.offset !== undefined;
    const query = `
        query QueryTicketItems($dataCollectionId: String!, $fields: [String!], $filter: JSON${usesOffsetPaging ? ', $offset: Int' : ', $cursor: String'}) {
            dataItemsV2DataItems(queryInput: {
                dataCollectionId: $dataCollectionId,
                query: {
                    fields: $fields,
                    filter: $filter,
                    ${usesOffsetPaging
                        ? 'paging: { limit: ' + args.limit + ', offset: $offset }'
                        : 'cursorPaging: { limit: ' + args.limit + ', cursor: $cursor }'}
                    ${args.sort ? `, sort: [${args.sort.map((item) => `{ fieldName: "${item.fieldName}", order: ${item.order} }`).join(', ')}]` : ''}
                }
            }) {
                items { id data }
                pageInfo { hasNext nextCursor }
            }
        }
    `;

    const response = await fetch(WIX_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${args.accessToken}`,
        },
        body: JSON.stringify({
            query,
            variables: {
                dataCollectionId: args.dataCollectionId,
                fields: args.fields,
                filter: args.filter ?? {},
                ...(usesOffsetPaging ? { offset: args.offset } : { cursor: args.cursor ?? null }),
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Wix GraphQL HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.errors?.length) {
        throw new Error(`Wix GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const page = result?.data?.dataItemsV2DataItems;
    if (!Array.isArray(page?.items) || !page?.pageInfo) {
        throw new Error('Wix GraphQL returned an invalid ticket items page');
    }

    return page as GraphQLDataItemsPage;
}

export const mapGraphQLDataItem = <T extends Record<string, unknown>>(item: GraphQLDataItem): T => ({
    ...item.data,
    _id: item.id,
}) as T;

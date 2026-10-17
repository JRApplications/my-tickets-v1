import {
    CollectionEmptyState,
    CollectionErrorState,
    CollectionNoResultsState,
    CollectionSearch,
    Table,
    useTableCollection,
    type OffsetQuery,
} from '@wix/patterns';
import {
    Card,
    SkeletonRectangle,
} from '@wix/design-system';
import { Duplicate, Delete, Edit } from '@wix/wix-ui-icons-common/lazy';

interface Props {
    isLoading: boolean;
    data?: RoleData[];
    refreshKey: number;
    onEditRole: (roleId: string) => void;
    onDelete: (roleId: string) => void;
    onDuplicate: (roleId: string) => void;
    onCreateRole: () => void;
    canCreateRole?: boolean;
}

interface RoleData {
    id?: string;
    roleName: string;
    lastUpdated: string;
    created: string;
}

const ListRoles = ({
    data,
    onEditRole,
    onDelete,
    onDuplicate,
    onCreateRole,
    canCreateRole = true,
    isLoading,
    refreshKey,
}: Props) => {
    const tableState = useTableCollection<RoleData>({
        queryName: `my-tickets.roles.${refreshKey}`,
        paginationMode: 'offset',
        queryOptions: { staleTime: 0 },
        itemKey: (role) => role.id ?? role.roleName,
        itemName: (role) => role.roleName,
        filters: {},
        fetchData: async ({ limit, offset, search }: OffsetQuery) => {
            const normalizedSearch = search?.trim().toLowerCase();
            const matchingRoles = normalizedSearch
                ? (data ?? []).filter((role) => role.roleName.toLowerCase().includes(normalizedSearch))
                : data ?? [];

            return {
                items: matchingRoles.slice(offset, offset + limit),
                total: matchingRoles.length,
            };
        },
    });

    const columns = [
        { id: 'name', title: 'Name', render: (row: RoleData) => row.roleName || '' },
        { id: 'lastUpdated', title: 'Last Updated', render: (row: RoleData) => row.lastUpdated || '' },
        { id: 'created', title: 'Created', render: (row: RoleData) => row.created || '' },
    ];

    if (isLoading) {
        return (
            <Card>
                <SkeletonRectangle width="100%" height="180px" />
            </Card>
        );
    }

    return (
        <Table
            state={tableState}
            columns={columns}
            emptyState={
                <CollectionEmptyState
                    title="Create your first role"
                    subtitle="Once you create your roles, you'll be able to see and manage them here."
                    {...(canCreateRole ? { addNewCta: { text: 'Create Role', onClick: onCreateRole } } : {})}
                />
            }
            noResultsState={
                <CollectionNoResultsState
                    title="No roles found"
                    subtitle="No roles match your search. Try a different search term."
                />
            }
            errorState={(error, { retry }) => (
                <CollectionErrorState
                    title="Failed to load roles"
                    subtitle={String(error)}
                    action={{ text: 'Retry', onClick: retry }}
                />
            )}
            actionCell={(row) => ({
                primaryAction: {
                    text: 'Edit',
                    prefixIcon: <Edit />,
                    onClick: () => onEditRole(row.id!),
                },
                secondaryActions: [
                    {
                        text: 'Duplicate',
                        icon: <Duplicate />,
                        onClick: () => onDuplicate(row.id!),
                    },
                    {
                        text: 'Delete',
                        icon: <Delete />,
                        skin: 'destructive',
                        onClick: () => onDelete(row.id!),
                    },
                ],
            })}
            search={<CollectionSearch placeholder="Search roles" />}
        />
    );
}

export default ListRoles;

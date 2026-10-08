import { useState } from 'react';
import {
    Card,
    Button,
    Table,
    TableActionCell,
    TableToolbar,
    Search,
    SkeletonRectangle,
    SkeletonLine
} from '@wix/design-system';
import { Duplicate, Delete } from '@wix/wix-ui-icons-common/odeditor';

interface Props {
    isLoading: boolean;
    data?: RoleData[];
    onEditRole: (roleId: string) => void;
    onDelete: (roleId: string) => void;
    onDuplicate: (roleId: string) => void;
    onCreateRole: () => void;
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
    isLoading
}: Props) => {
    const [filter, setFilter] = useState('');
    const normalizedFilter = filter.trim().toLowerCase();
    const filteredData = normalizedFilter
        ? data?.filter((row) => row.roleName?.toLowerCase().includes(normalizedFilter))
        : data;

    const columns = [
        { title: 'Name', render: (row: RoleData) => row.roleName ? row.roleName : '' },
        { title: 'Last Updated', render: (row: RoleData) => row.lastUpdated ? row.lastUpdated : '' },
        { title: 'Created', render: (row: RoleData) => row.created ? row.created : '' },
        {
            title: '',
            width: '100px',
            render: (row: RoleData) =>
                <TableActionCell
                    popoverMenuProps={
                        { appendTo: 'window', placement: 'left' }
                    }
                    primaryAction={{ text: 'Edit', onClick: () => onEditRole(row.id!) }}
                    secondaryActions={[
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
                    ]}
                    moreActionsTooltipText="More actions"
                />
        },
    ];

    const renderEmptyState = () => {
        if (normalizedFilter) {
            return (
                <Table.EmptyState
                    skin='page-no-border'
                    title="No roles found"
                    subtitle={`No roles match "${filter}". Try a different search term.`}
                />
            );
        }
        return (
            <Table.EmptyState
                skin='page-no-border'
                title="Create your first role"
                subtitle="Once you create your roles, you'll be able to see and manage them here."
            >
                <Button onClick={onCreateRole}>Create Role</Button>
            </Table.EmptyState>
        );
    };

    if (isLoading) {
        return (
            <Card>
                <Table
                    showHeaderWhenEmpty
                    columns={[
                        { title: <SkeletonLine width="100px" />, render: () => <SkeletonRectangle width="100px" height="20px" /> },
                        { title: <SkeletonLine width="100px" />, render: () => <SkeletonRectangle width="100px" height="20px" /> },
                        { title: <SkeletonLine width="100px" />, render: () => <SkeletonRectangle width="100px" height="20px" /> },
                        {
                            title: '',
                            width: '100px',
                            render: () =>
                                <SkeletonRectangle width="50px" height="30px" />
                        },
                    ]}
                    data={[{}, {}, {}]}
                >
                    <TableToolbar>
                        <TableToolbar.ItemGroup position="end">
                            <TableToolbar.Item>
                                <SkeletonRectangle width="200px" height="35px" />
                            </TableToolbar.Item>
                        </TableToolbar.ItemGroup>
                    </TableToolbar>
                    <Table.Content />
                </Table>
            </Card>
        );
    }

    return (
        <Card>
            <Table
                showHeaderWhenEmpty
                columns={columns}
                data={filteredData}
            >
                <TableToolbar>
                    <TableToolbar.ItemGroup position="end">
                        <TableToolbar.Item>
                            <Search
                                size="medium"
                                value={filter}
                                onChange={(event) =>
                                    setFilter(event.target.value)
                                }
                                onClear={() => setFilter('')}
                            />
                        </TableToolbar.Item>
                    </TableToolbar.ItemGroup>
                </TableToolbar>
                {filteredData?.length !== undefined && filteredData?.length > 0 && <Table.Content />}
                {filteredData?.length === 0 && renderEmptyState()}
            </Table>
        </Card>
    )
}

export default ListRoles;
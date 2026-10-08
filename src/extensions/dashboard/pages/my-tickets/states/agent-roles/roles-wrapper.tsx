import {
    Box,
    Button,
    Loader,
    Page,
    SkeletonRectangle
} from '@wix/design-system';
import { Add, Confirm } from '@wix/wix-ui-icons-common/odeditor';

import './roles.css';
import ListRoles from './states/list-roles';
import CreateManageRole from './states/create-manage-role';
import { useRoles } from './useRoles';
import { LoadingState } from '@jrapps/my_tickets_dashboard_ui';
import { PermissionDeniedState } from '@jrapps/my_tickets_dashboard_ui';

interface Props {
    permissions: string[];
}

const RolesWrapper = ({
    permissions
}: Props) => {
    const {
        state,
        isLoading,
        isError,
        isLoadingRole,
        isSaving,
        selectedRole,
        tableData,
        handleSaveRole,
        onBack,
        onCreateRole,
        onEditRole,
        onRoleEdited,
        onDeleteRole,
        onDuplicateRole
    } = useRoles();

    if (!permissions?.includes('my-tickets-view-roles')) {
        return (<PermissionDeniedState />)
    }

    if (isError) {
        return (
            <LoadingState
                state={'error'}
                errorText='Failed to load roles. Please try again later.'
            />
        );
    }

    return (
        <Page maxWidth={9999} className='roles-wrapper-page'>
            <Page.Header
                title="Roles & Permissions"
                actionsBar={isLoading ? (
                    <SkeletonRectangle width="140px" height="40px" />
                ) : (
                    <Box gap={2}>
                        {state === 'create-manage-role' && <Button priority='secondary' onClick={onBack}>Back</Button>}
                        {state === 'create-manage-role' && <Button prefixIcon={<Confirm />} onClick={handleSaveRole}>{isSaving ? <Loader size="tiny" /> : "Save Role"}</Button>}
                        {state === 'list-roles' && permissions?.includes('my-tickets-create-roles') && <Button prefixIcon={<Add />} onClick={onCreateRole}>Create Role</Button>}

                    </Box>
                )}
            />
            <Page.Content>
                <Box width={'100%'} height={'100%'} direction={'vertical'} maxHeight={'100%'} boxSizing='border-box'>
                    {!isError && state === 'create-manage-role' && (
                        <CreateManageRole data={selectedRole} onDataChange={onRoleEdited} isLoadingRole={isLoadingRole} />
                    )}
                    {!isError && state === 'list-roles' && (
                        <ListRoles isLoading={isLoading} onCreateRole={onCreateRole} data={tableData} onEditRole={onEditRole} onDelete={onDeleteRole} onDuplicate={onDuplicateRole} />
                    )}
                </Box>
            </Page.Content>
        </Page>
    )
}

export default RolesWrapper;
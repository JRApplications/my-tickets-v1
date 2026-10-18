import {
    Box,
    Button,
    EmptyState,
    Loader,
    Page,
    SkeletonRectangle
} from '@wix/design-system';
import { CollectionPage } from '@wix/patterns/page';
import { Add, Confirm } from '@wix/wix-ui-icons-common/lazy';

import './roles.css';
import ListRoles from './states/list-roles';
import CreateManageRole from './states/create-manage-role';
import type { CurrentAppPlan } from '../../auth/fetchCurrentAppPlan';
import { useRoles } from './useRoles';
import { LoadingState, PermissionDeniedState } from '@jrapps/my_tickets_dashboard_ui';

interface Props {
    permissions: string[];
    appPlan: CurrentAppPlan | null;
}

const RolesWrapper = ({
    permissions,
    appPlan,
}: Props) => {
    const normalizedPlanName = typeof appPlan?.planName === 'string'
        ? appPlan.planName.toLowerCase().replace(/[ _-]/g, '')
        : '';
    const canManageRoles = normalizedPlanName.includes('team') || normalizedPlanName.includes('advanced');
    const planAccess: 'allowed' | 'restricted' | 'error' = !appPlan ? 'error' : canManageRoles ? 'allowed' : 'restricted';
    const upgradeUrl = appPlan?.upgradeUrl;
    const {
        state,
        isLoading,
        isError,
        isLoadingRole,
        isSaving,
        selectedRole,
        tableData,
        tableRefreshKey,
        handleSaveRole,
        onBack,
        onCreateRole,
        onEditRole,
        onRoleEdited,
        onDeleteRole,
        onDuplicateRole,
        isCreating,
    } = useRoles();

    if (!permissions?.includes('my-tickets-view-roles')) {
        return (<PermissionDeniedState />)
    }

    if (planAccess === 'error') {
        return (
            <LoadingState
                state={'error'}
                errorText='Could not check your plan. Please refresh and try again.'
            />
        );
    }

    if (isError && planAccess === 'allowed') {
        return (
            <LoadingState
                state={'error'}
                errorText='Failed to load roles. Please try again later.'
            />
        );
    }

    const canCreateRole = permissions.includes('my-tickets-create-roles');
    const canEditRole = permissions.includes('my-tickets-edit-roles');
    let actionsBar;

    if (planAccess === 'allowed' && isLoading) {
        actionsBar = <SkeletonRectangle width="140px" height="40px" />;
    } else if (planAccess === 'restricted') {
        actionsBar = upgradeUrl
            ? <Button skin="premium" priority="primary" onClick={() => window.open(upgradeUrl, '_blank', 'noopener,noreferrer')}>Upgrade plan</Button>
            : undefined;
    } else if (planAccess === 'allowed') {
        actionsBar = (
            <Box gap={2}>
                {state === 'create-manage-role' && <Button priority='secondary' onClick={onBack}>Back</Button>}
                {state === 'create-manage-role' && (isCreating ? canCreateRole : canEditRole) && (
                    <Button prefixIcon={<Confirm />} onClick={handleSaveRole} disabled={isSaving || isLoadingRole}>
                        {isSaving ? <Loader size="tiny" /> : 'Save Role'}
                    </Button>
                )}
                {state === 'list-roles' && canCreateRole && <Button prefixIcon={<Add />} onClick={onCreateRole}>Create Role</Button>}
            </Box>
        );
    }

    if (planAccess === 'allowed' && state === 'list-roles') {
        return (
            <CollectionPage height="100%">
                <CollectionPage.Header
                    title={{ text: 'Roles & Permissions', hideTotal: true }}
                    primaryAction={actionsBar}
                />
                <CollectionPage.Content>
                    <Box width="100%" height="100%" direction="vertical" maxHeight="100%" boxSizing="border-box">
                        <ListRoles
                            isLoading={isLoading}
                            canCreateRole={canCreateRole}
                            refreshKey={tableRefreshKey}
                            onCreateRole={onCreateRole}
                            data={tableData}
                            onEditRole={onEditRole}
                            onDelete={onDeleteRole}
                            onDuplicate={onDuplicateRole}
                        />
                    </Box>
                </CollectionPage.Content>
            </CollectionPage>
        );
    }

    return (
        <Page maxWidth={9999} className='roles-wrapper-page'>
            <Page.Header title="Roles & Permissions" actionsBar={actionsBar} />
            <Page.Content>
                <Box width={'100%'} height={'100%'} direction={'vertical'} maxHeight={'100%'} boxSizing='border-box'>
                    {planAccess === 'restricted' && (
                        <EmptyState
                            title="Roles & Permissions require a Team or Advanced plan"
                            subtitle="Upgrade your plan to create and manage custom roles."
                            skin="page"
                        >
                            {upgradeUrl && <Button skin="premium" priority="primary" onClick={() => window.open(upgradeUrl, '_blank', 'noopener,noreferrer')}>Upgrade plan</Button>}
                        </EmptyState>
                    )}
                    {planAccess === 'allowed' && !isError && state === 'create-manage-role' && (
                        <CreateManageRole data={selectedRole} onDataChange={onRoleEdited} isLoadingRole={isLoadingRole} />
                    )}
                </Box>
            </Page.Content>
        </Page>
    )
}

export default RolesWrapper;

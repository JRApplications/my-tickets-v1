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
import { useEffect, useState } from 'react';
import { httpClient } from '@wix/essentials';
import { useRoles } from './useRoles';
import { LoadingState, PermissionDeniedState } from '@jrapps/my_tickets_dashboard_ui';

interface Props {
    permissions: string[];
}

const RolesWrapper = ({
    permissions
}: Props) => {
    const [planAccess, setPlanAccess] = useState<'loading' | 'allowed' | 'restricted' | 'error'>('loading');
    const [upgradeUrl, setUpgradeUrl] = useState<string | undefined>();
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

    useEffect(() => {
        let isMounted = true;
        const loadPlanAccess = async () => {
            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await httpClient.fetchWithAuth(`${baseApiUrl}/api/my-tickets-auth/app-plan`);
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load your plan');
                const normalizedPlanName = typeof result.planName === 'string'
                    ? result.planName.toLowerCase().replace(/[ _-]/g, '')
                    : '';
                const canManageRoles = normalizedPlanName.includes('team') || normalizedPlanName.includes('advanced');
                if (isMounted) {
                    setUpgradeUrl(typeof result.upgradeUrl === 'string' ? result.upgradeUrl : undefined);
                    setPlanAccess(canManageRoles ? 'allowed' : 'restricted');
                }
            } catch (error) {
                console.error('Failed to load the plan for role access', error);
                if (isMounted) setPlanAccess('error');
            }
        };
        void loadPlanAccess();
        return () => { isMounted = false; };
    }, []);

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

    if (planAccess === 'loading' || (planAccess === 'allowed' && isLoading)) {
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
                    {planAccess === 'loading' && <Box width="100%" height="100%" align="center" verticalAlign="middle"><Loader /></Box>}
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

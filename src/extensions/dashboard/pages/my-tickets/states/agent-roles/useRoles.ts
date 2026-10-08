import { useState, useEffect } from 'react';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';
import { myTicketsFetchWithAuth } from '../../auth/myTicketsFetchWithAuth';

interface CreateManageRoleData {
    id?: string;
    roleName?: string;
    roleDescription?: string;
    permissions?: string[];
}

interface RoleListItem {
    id?: string;
    roleName: string;
    lastUpdated: string;
    created: string;
}

export const useRoles = () => {
    const [state, setState] = useState<string>('list-roles');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isLoadingRole, setIsLoadingRole] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [selectedRole, setSelectedRole] = useState<CreateManageRoleData | null>(null);
    const [tableData, setTableData] = useState<RoleListItem[]>();
    const [isCreating, setIsCreating] = useState<boolean>(false);

    useEffect(() => {
        const fetchRoles = async () => {
            setIsLoading(true);
            try {
                const baseApiUrl = new URL(import.meta.url).origin;
                const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/roles/get`);
                if (!response.ok) {
                    throw new Error(`Error fetching roles: ${response.statusText}`);
                }
                const data = await response.json();
                if (data.success) {
                    setTableData(data.roles);
                } else {
                    throw new Error(data.error || 'Unknown error');
                }

            } catch (error: any) {
                console.error(error.message);
                setIsError(true);
                setIsLoading(false);
                setErrorMessage(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRoles();
    }, []);

    const onBack = () => {
        setState('list-roles');
        setSelectedRole(null);
        setIsCreating(false);
    }

    const onCreateRole = () => {
        setIsLoadingRole(false);
        setState('create-manage-role');
        setIsCreating(true);
        setSelectedRole(null);
    }

    const onEditRole = async (role: string) => {
        setIsLoadingRole(true);
        setState('create-manage-role');
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/roles/get?id=${role}`);
            if (!response.ok) {
                throw new Error(`Error fetching role: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.success) {
                setSelectedRole(data.role);
                
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error: any) {
            console.error(error.message);
            ShowToast({message: error.message, type: 'error'});
            setState('list-roles');
        } finally {
            setIsLoadingRole(false);
        }
    }

    const onRoleEdited = (updatedRole: CreateManageRoleData) => {
        setSelectedRole(updatedRole);
    }

    const handleSaveRole = async () => {
        if (!selectedRole) {
            ShowToast({message: "No role selected to save.", type: 'error'});
            return;
        }

        if (!selectedRole.roleName || !selectedRole.roleDescription || !selectedRole.permissions) {
            ShowToast({message: "Missing required fields: roleName, roleDescription, and permissions are required.", type: 'error'});
            return;
        }

        setIsSaving(true);
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/roles/${selectedRole.id ? `update?id=${selectedRole.id}` : 'create'}`, {
                method: selectedRole.id ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(selectedRole)
            });
            if (!response.ok) {
                throw new Error(`Error saving role: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.success) {
                const savedRole = data.role;
                if (selectedRole.id) {
                    // Update existing row in table
                    setTableData(prev => prev?.map(r => (r as any).id === savedRole.id ? savedRole : r));
                } else {
                    // Push new role into table
                    setTableData(prev => [...(prev ?? []), savedRole]);
                }
                setSelectedRole(savedRole);
                setState('list-roles');
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error: any) {
            console.error(error.message);
            ShowToast({message: error.message, type: 'error'});
        } finally {
            setIsSaving(false);
        }

    }

    const onDeleteRole = async (roleId: string) => {
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/roles/delete?id=${roleId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`Error deleting role: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.success) {
                setTableData(prev => prev?.filter(r => (r as any).id !== roleId));
                ShowToast({message: "Role deleted successfully.", type: 'success'});
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error: any) {
            console.error(error.message);
            ShowToast({message: error.message, type: 'error'});
        }
    }

    const onDuplicateRole = async (roleId: string) => {
        try {
            const baseApiUrl = new URL(import.meta.url).origin;
            const response = await myTicketsFetchWithAuth(`${baseApiUrl}/api/roles/duplicate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: roleId })
            });
            if (!response.ok) {
                throw new Error(`Error duplicating role: ${response.statusText}`);
            }
            const data = await response.json();
            if (data.success) {
                const duplicatedRole = data.role;
                setTableData(prev => [...(prev ?? []), duplicatedRole]);
                ShowToast({message: "Role duplicated successfully.", type: 'success'});
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error: any) {
            console.error(error.message);
            ShowToast({message: error.message, type: 'error'});
        }
    }

    return {
        state,
        isLoading,
        isError,
        errorMessage,
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
        onDuplicateRole,
        isCreating,
    }
}
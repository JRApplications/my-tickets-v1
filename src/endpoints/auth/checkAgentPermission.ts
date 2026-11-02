import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { isSystemAdmin } from './system-admin';

export const checkAgentPermission = async (agentId: string | null | undefined, permission: string): Promise<boolean> => {
    if (!agentId) return false;
    if (isSystemAdmin(agentId)) return true;

    const agent = await items.get(CollectionIds.AGENTS, agentId);
    if (!agent) return false;
    if (agent.isAdmin === true || agent.role?.roleName === 'DEFAULT_ADMIN') return true;

    const roleId = typeof agent.role === 'string' ? agent.role : agent.role?._id;
    const role = Array.isArray(agent.role?.permissions)
        ? agent.role
        : roleId
            ? await items.get(CollectionIds.ROLES, roleId)
            : null;
    return Array.isArray(role?.permissions) && role.permissions.includes(permission);
};

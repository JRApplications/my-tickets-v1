export const SYSTEM_ADMIN_ID = 'system_admin';
export const SYSTEM_ADMIN_NAME = 'System';
export const SYSTEM_ADMIN_EMAIL = 'admin@mytickets.wix.com';

export const isSystemAdmin = (agentId: string | null | undefined): boolean =>
    agentId === SYSTEM_ADMIN_ID;

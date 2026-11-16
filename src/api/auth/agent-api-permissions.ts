import { checkAgentPermission } from './checkAgentPermission';
import type { MyTicketsIdentity } from '../my-tickets-auth/token';

type PermissionRule = {
    path: string;
    permission: string;
};

const exactRules: PermissionRule[] = [
    { path: '/agents/logged-in-agent', permission: '' },
    { path: '/using-my-tickets/isBetaUser', permission: '' },
    { path: '/get-support', permission: '' },
    { path: '/offline-form-submissions/get', permission: 'my-tickets-view-offline-form-submissions' },
    { path: '/offline-form-submissions/update-status', permission: 'my-tickets-manage-offline-form-submissions' },

    { path: '/members/get', permission: 'my-tickets-view-members' },
    { path: '/members/viewMember', permission: 'my-tickets-view-members' },

    { path: '/agents/create', permission: 'my-tickets-create-accounts' },
    { path: '/agents/update', permission: 'my-tickets-edit-accounts' },
    { path: '/agents/delete', permission: 'my-tickets-edit-accounts' },
    { path: '/agents/get', permission: 'my-tickets-view-accounts' },
    { path: '/agents/getMentionList', permission: 'my-tickets-view-accounts' },
    { path: '/agents/getAgentName', permission: 'my-tickets-view-accounts' },

    { path: '/teams/get', permission: 'my-tickets-view-teams' },
    { path: '/teams/create', permission: 'my-tickets-create-teams' },
    { path: '/teams/update', permission: 'my-tickets-edit-teams' },
    { path: '/teams/delete', permission: 'my-tickets-edit-teams' },

    { path: '/roles/get', permission: 'my-tickets-view-roles' },
    { path: '/roles/create', permission: 'my-tickets-create-roles' },
    { path: '/roles/duplicate', permission: 'my-tickets-create-roles' },
    { path: '/roles/update', permission: 'my-tickets-edit-roles' },
    { path: '/roles/delete', permission: 'my-tickets-edit-roles' },

    { path: '/tickets/createTicket', permission: 'my-tickets-create-ticket' },
    { path: '/tickets/updateTags', permission: 'my-tickets-manage-ticket-tags' },
    { path: '/tickets/updateDisposition', permission: 'my-tickets-manage-ticket-disposition' },
    { path: '/tickets/updatePriority', permission: 'my-tickets-change-ticket-priority' },
    { path: '/tickets/transfer', permission: 'my-tickets-transfer-ticket' },
    { path: '/tickets/assignAgent', permission: 'my-tickets-transfer-ticket' },
    { path: '/tickets/unassignAgent', permission: 'my-tickets-transfer-ticket' },
    { path: '/tickets/merge', permission: 'my-tickets-merge-tickets' },
    { path: '/tickets/validateMerge', permission: 'my-tickets-merge-tickets' },
    { path: '/tickets/sendMessage', permission: 'my-tickets-single-ticket-send-message' },
    { path: '/tickets/internal-note/send-message', permission: 'my-tickets-manage-internal-notes' },
    { path: '/tickets/followTicket', permission: 'my-tickets-view-single-ticket' },
    { path: '/tickets/unfollowTicket', permission: 'my-tickets-view-single-ticket' },
    { path: '/tickets/timeline/addTimeline', permission: 'my-tickets-view-single-ticket' },
    { path: '/tickets/timeline/getTicketTimeline', permission: 'my-tickets-view-single-ticket' },
    { path: '/tickets/getTicketById', permission: 'my-tickets-view-single-ticket' },
    { path: '/tickets/getRelatedTickets', permission: 'my-tickets-view-single-ticket' },
    { path: '/tickets/presence', permission: 'my-tickets-view-single-ticket' },
    { path: '/tickets/sidebar/get', permission: 'my-tickets-view-all-tickets' },
    { path: '/tickets/sidebar/search', permission: 'my-tickets-view-all-tickets' },
    { path: '/tickets/sidebar/assignees', permission: 'my-tickets-view-all-tickets' },
    { path: '/tickets/analytics', permission: 'my-tickets-view-all-tickets' },
    { path: '/tickets/queryTickets', permission: 'my-tickets-view-all-tickets' },

    { path: '/chat-admin/joinChat', permission: 'my-tickets-join-single-chat' },
    { path: '/chat-admin/leaveChat', permission: 'my-tickets-join-single-chat' },
    { path: '/chat-admin/endChat', permission: 'my-tickets-end-single-chat' },
    { path: '/chat-admin/sendMessage', permission: 'my-tickets-single-chat-send-message' },
    { path: '/chat-admin/sendConnectionMessage', permission: 'my-tickets-single-chat-send-message' },
    { path: '/chat-admin/getUpdatedMessages', permission: 'my-tickets-view-single-chat' },
    { path: '/chat-admin/getSidebarItems', permission: 'my-tickets-view-chats' },

    { path: '/internal-mail/createMail', permission: 'my-tickets-access-internal-chat' },
    { path: '/internal-mail/sendMessage', permission: 'my-tickets-access-internal-chat' },
    { path: '/internal-mail/getMail', permission: 'my-tickets-access-internal-chat' },
    { path: '/internal-mail/getAllMail', permission: 'my-tickets-access-internal-chat' },
    { path: '/internal-mail/getAddressBook', permission: 'my-tickets-access-internal-chat' },
    { path: '/internal-mail/getMailSidebarMetaData', permission: 'my-tickets-access-internal-chat' },
    { path: '/internal-mail/markAsRead', permission: 'my-tickets-access-internal-chat' },
    { path: '/internal-mail/updateFlaggedStatus', permission: 'my-tickets-access-internal-chat' },

    { path: '/notifications/getNotifications', permission: 'my-tickets-notifications-enabled' },
    { path: '/notifications/sendNotification', permission: 'my-tickets-notifications-enabled' },
    { path: '/notifications/removeNotification', permission: 'my-tickets-notifications-enabled' },

    { path: '/workforce/overview', permission: 'my-tickets-view-workforce' },
    { path: '/reports/analytics', permission: 'my-tickets-view-reports' },

    { path: '/chat-settings/config', permission: 'my-tickets-manage-chat-widget-settings' },

    { path: '/sla/sweep', permission: 'my-tickets-view-all-tickets' },
    { path: '/sla-settings/config', permission: 'my-tickets-manage-sla-settings' },
    { path: '/sla-settings/get', permission: 'my-tickets-manage-sla-settings' },
];

const fallbackPermissions: Record<string, string> = {
    '/agents': 'my-tickets-view-accounts',
    '/members': 'my-tickets-view-members',
    '/tickets': 'my-tickets-view-all-tickets',
    '/teams': 'my-tickets-view-teams',
    '/roles': 'my-tickets-view-roles',
    '/chat-admin': 'my-tickets-view-chats',
    '/internal-mail': 'my-tickets-access-internal-chat',
    '/notifications': 'my-tickets-notifications-enabled',
    '/workforce': 'my-tickets-view-workforce',
    '/reports': 'my-tickets-view-reports',
    '/sidebar-ai': 'my-tickets-use-ai-assistant',
    '/chat-settings': 'my-tickets-manage-chat-widget-settings',
    '/sla': 'my-tickets-view-all-tickets',
    '/sla-settings': 'my-tickets-manage-sla-settings',
    '/using-my-tickets': 'my-tickets-view-workforce',
    '/mini-ai': 'my-tickets-use-ai-assistant',
};

export async function getRequiredAgentPermission(request: Request): Promise<string | null> {
    const rawPathname = new URL(request.url).pathname.replace(/\/$/, '');
    const endpointRoots = [
        'agents', 'tickets', 'teams', 'roles', 'chat-admin', 'internal-mail', 'members',
        'notifications', 'workforce', 'sidebar-ai', 'chat-settings', 'using-my-tickets',
        'get-support', 'mini-ai', 'reports', 'offline-form-submissions',
    ];
    const pathSegments = rawPathname.split('/').filter(Boolean);
    const endpointRootIndex = pathSegments.findIndex((segment) => endpointRoots.includes(segment));
    const pathname = endpointRootIndex >= 0
        ? `/${pathSegments.slice(endpointRootIndex).join('/')}`
        : rawPathname;
    if (pathname === '/tickets/timeline/addTimeline') {
        try {
            const { type, message } = await request.clone().json() as { type?: string; message?: string };
            const timelinePermissions: Record<string, string> = {
                ticket_created: 'my-tickets-create-ticket',
                ticket_transferred: 'my-tickets-transfer-ticket',
                agent_assigned: 'my-tickets-transfer-ticket',
                agent_unassigned: 'my-tickets-transfer-ticket',
                ticket_priority_changed: 'my-tickets-change-ticket-priority',
                ticket_status_changed: /\b(open|opened|reopen|reopened)\b/i.test(message ?? '')
                    ? 'my-tickets-reopen-single-ticket'
                    : 'my-tickets-close-single-ticket',
                ticket_opened: 'my-tickets-reopen-single-ticket',
                ticket_closed: 'my-tickets-close-single-ticket',
                ticket_reopened: 'my-tickets-reopen-single-ticket',
                ticket_deleted: 'my-tickets-manage-ticket-disposition',
                ticket_marked_spam: 'my-tickets-manage-ticket-disposition',
                ticket_restored: 'my-tickets-manage-ticket-disposition',
                ticket_merged: 'my-tickets-merge-tickets',
                ticket_tags_changed: 'my-tickets-manage-ticket-tags',
            };
            return type ? timelinePermissions[type] ?? '__invalid_timeline_permission__' : '__invalid_timeline_permission__';
        } catch {
            return '__invalid_timeline_permission__';
        }
    }

    const exactRule = exactRules.find((rule) => rule.path === pathname);
    if (exactRule) return exactRule.permission || null;

    if (pathname === '/tickets/updateStatus') {
        const newStatus = new URL(request.url).searchParams.get('status')?.toLowerCase();
        return newStatus === 'open' || newStatus === 'reopened'
            ? 'my-tickets-reopen-single-ticket'
            : 'my-tickets-close-single-ticket';
    }

    for (const [prefix, permission] of Object.entries(fallbackPermissions)) {
        if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return permission;
    }
    return null;
}

export async function agentHasRequestPermission(
    identity: MyTicketsIdentity,
    request: Request,
): Promise<boolean> {
    const permission = await getRequiredAgentPermission(request);
    if (permission === null) return true;
    if (await checkAgentPermission(identity.agentId, permission)) return true;
    return permission === 'my-tickets-view-single-ticket'
        && checkAgentPermission(identity.agentId, 'my-tickets-view-all-tickets');
}

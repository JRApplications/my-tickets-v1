import { checkAgentPermission } from './checkAgentPermission';
import type { MyTicketsIdentity } from '../my-tickets-auth/token';

type PermissionRule = {
    path: string;
    permission: string;
};

const exactRules: PermissionRule[] = [
    { path: '/api/agents/logged-in-agent', permission: '' },
    { path: '/api/using-my-tickets/isBetaUser', permission: '' },
    { path: '/api/get-support', permission: '' },
    { path: '/api/offline-form-submissions/get', permission: 'my-tickets-view-offline-form-submissions' },
    { path: '/api/offline-form-submissions/update-status', permission: 'my-tickets-manage-offline-form-submissions' },

    { path: '/api/members/get', permission: 'my-tickets-view-members' },
    { path: '/api/members/viewMember', permission: 'my-tickets-view-members' },

    { path: '/api/agents/create', permission: 'my-tickets-create-accounts' },
    { path: '/api/agents/update', permission: 'my-tickets-edit-accounts' },
    { path: '/api/agents/delete', permission: 'my-tickets-edit-accounts' },
    { path: '/api/agents/get', permission: 'my-tickets-view-accounts' },
    { path: '/api/agents/getMentionList', permission: 'my-tickets-view-accounts' },
    { path: '/api/agents/getAgentName', permission: 'my-tickets-view-accounts' },

    { path: '/api/teams/get', permission: 'my-tickets-view-teams' },
    { path: '/api/teams/create', permission: 'my-tickets-create-teams' },
    { path: '/api/teams/update', permission: 'my-tickets-edit-teams' },
    { path: '/api/teams/delete', permission: 'my-tickets-edit-teams' },

    { path: '/api/roles/get', permission: 'my-tickets-view-roles' },
    { path: '/api/roles/create', permission: 'my-tickets-create-roles' },
    { path: '/api/roles/duplicate', permission: 'my-tickets-create-roles' },
    { path: '/api/roles/update', permission: 'my-tickets-edit-roles' },
    { path: '/api/roles/delete', permission: 'my-tickets-edit-roles' },

    { path: '/api/tickets/createTicket', permission: 'my-tickets-create-ticket' },
    { path: '/api/tickets/updateTags', permission: 'my-tickets-manage-ticket-tags' },
    { path: '/api/tickets/updateDisposition', permission: 'my-tickets-manage-ticket-disposition' },
    { path: '/api/tickets/updatePriority', permission: 'my-tickets-change-ticket-priority' },
    { path: '/api/tickets/transfer', permission: 'my-tickets-transfer-ticket' },
    { path: '/api/tickets/assignAgent', permission: 'my-tickets-transfer-ticket' },
    { path: '/api/tickets/unassignAgent', permission: 'my-tickets-transfer-ticket' },
    { path: '/api/tickets/merge', permission: 'my-tickets-merge-tickets' },
    { path: '/api/tickets/validateMerge', permission: 'my-tickets-merge-tickets' },
    { path: '/api/tickets/sendMessage', permission: 'my-tickets-single-ticket-send-message' },
    { path: '/api/tickets/internal-note/send-message', permission: 'my-tickets-manage-internal-notes' },
    { path: '/api/tickets/followTicket', permission: 'my-tickets-view-single-ticket' },
    { path: '/api/tickets/unfollowTicket', permission: 'my-tickets-view-single-ticket' },
    { path: '/api/tickets/timeline/addTimeline', permission: 'my-tickets-view-single-ticket' },
    { path: '/api/tickets/timeline/getTicketTimeline', permission: 'my-tickets-view-single-ticket' },
    { path: '/api/tickets/getTicketById', permission: 'my-tickets-view-single-ticket' },
    { path: '/api/tickets/getRelatedTickets', permission: 'my-tickets-view-single-ticket' },
    { path: '/api/tickets/presence', permission: 'my-tickets-view-single-ticket' },
    { path: '/api/tickets/sidebar/get', permission: 'my-tickets-view-all-tickets' },
    { path: '/api/tickets/sidebar/search', permission: 'my-tickets-view-all-tickets' },
    { path: '/api/tickets/analytics', permission: 'my-tickets-view-all-tickets' },
    { path: '/api/tickets/queryTickets', permission: 'my-tickets-view-all-tickets' },

    { path: '/api/chat-admin/joinChat', permission: 'my-tickets-join-single-chat' },
    { path: '/api/chat-admin/leaveChat', permission: 'my-tickets-join-single-chat' },
    { path: '/api/chat-admin/endChat', permission: 'my-tickets-end-single-chat' },
    { path: '/api/chat-admin/sendMessage', permission: 'my-tickets-single-chat-send-message' },
    { path: '/api/chat-admin/sendConnectionMessage', permission: 'my-tickets-single-chat-send-message' },
    { path: '/api/chat-admin/getUpdatedMessages', permission: 'my-tickets-view-single-chat' },
    { path: '/api/chat-admin/getSidebarItems', permission: 'my-tickets-view-chats' },

    { path: '/api/internal-mail/createMail', permission: 'my-tickets-access-internal-chat' },
    { path: '/api/internal-mail/sendMessage', permission: 'my-tickets-access-internal-chat' },
    { path: '/api/internal-mail/getMail', permission: 'my-tickets-access-internal-chat' },
    { path: '/api/internal-mail/getAllMail', permission: 'my-tickets-access-internal-chat' },
    { path: '/api/internal-mail/getAddressBook', permission: 'my-tickets-access-internal-chat' },
    { path: '/api/internal-mail/getMailSidebarMetaData', permission: 'my-tickets-access-internal-chat' },
    { path: '/api/internal-mail/markAsRead', permission: 'my-tickets-access-internal-chat' },
    { path: '/api/internal-mail/updateFlaggedStatus', permission: 'my-tickets-access-internal-chat' },

    { path: '/api/notifications/getNotifications', permission: 'my-tickets-notifications-enabled' },
    { path: '/api/notifications/sendNotification', permission: 'my-tickets-notifications-enabled' },
    { path: '/api/notifications/removeNotification', permission: 'my-tickets-notifications-enabled' },

    { path: '/api/workforce/overview', permission: 'my-tickets-view-workforce' },
    { path: '/api/reports/analytics', permission: 'my-tickets-view-reports' },

    { path: '/api/chat-settings/config', permission: 'my-tickets-manage-chat-widget-settings' },

    { path: '/api/sla/sweep', permission: 'my-tickets-view-all-tickets' },
    { path: '/api/sla-settings/config', permission: 'my-tickets-manage-sla-settings' },
    { path: '/api/sla-settings/get', permission: 'my-tickets-manage-sla-settings' },
];

const fallbackPermissions: Record<string, string> = {
    '/api/agents': 'my-tickets-view-accounts',
    '/api/members': 'my-tickets-view-members',
    '/api/tickets': 'my-tickets-view-all-tickets',
    '/api/teams': 'my-tickets-view-teams',
    '/api/roles': 'my-tickets-view-roles',
    '/api/chat-admin': 'my-tickets-view-chats',
    '/api/internal-mail': 'my-tickets-access-internal-chat',
    '/api/notifications': 'my-tickets-notifications-enabled',
    '/api/workforce': 'my-tickets-view-workforce',
    '/api/reports': 'my-tickets-view-reports',
    '/api/sidebar-ai': 'my-tickets-use-ai-assistant',
    '/api/chat-settings': 'my-tickets-manage-chat-widget-settings',
    '/api/sla': 'my-tickets-view-all-tickets',
    '/api/sla-settings': 'my-tickets-manage-sla-settings',
    '/api/using-my-tickets': 'my-tickets-view-workforce',
    '/api/mini-ai': 'my-tickets-use-ai-assistant',
};

export async function getRequiredAgentPermission(request: Request): Promise<string | null> {
    const pathname = new URL(request.url).pathname.replace(/\/$/, '');
    if (pathname === '/api/tickets/timeline/addTimeline') {
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

    if (pathname === '/api/tickets/updateStatus') {
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
    return permission === null || checkAgentPermission(identity.agentId, permission);
}

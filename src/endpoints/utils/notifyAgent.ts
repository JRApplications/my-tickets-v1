import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { publisher } from '@wix/realtime';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { isSystemAdmin } from '../auth/system-admin';

export interface AgentNotification {
    id: string;
    title: string;
    subtitle: string;
}

export const insertAgentNotification = async (agentId: string, notification: AgentNotification) => {
    try {
        return await auth.elevate(items.patch)(CollectionIds.AGENTS, agentId).appendToArray('notifications', notification).run();
    } catch {
        throw new Error('Failed to insert notification');
    }
};

export const publishAgentNotification = async (agentId: string, notification: AgentNotification) => {
    try {
        return await auth.elevate(publisher.publish)({ name: 'AGENT_NOTIFICATIONS', resourceId: agentId }, { notification });
    } catch {
        throw new Error('Failed to send real-time notification');
    }
};

/** Stores the notification on the agent and pushes it live. */
export const notifyAgent = async (agentId: string, notification: AgentNotification): Promise<void> => {
    if (isSystemAdmin(agentId)) return;
    await insertAgentNotification(agentId, notification);
    await publishAgentNotification(agentId, notification);
};

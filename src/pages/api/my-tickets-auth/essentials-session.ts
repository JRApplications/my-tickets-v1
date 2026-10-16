import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { appInstances } from '@wix/app-management';
import { auth } from '@wix/essentials';
import { CollectionIds, type Agent } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';
import { issueToken } from './token';

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const authorization = request.headers.get('Authorization');
        if (!authorization || !await checkPermission(authorization, ['USER'])) {
            return jsonResponse({ success: false, error: 'Wix dashboard access is required' }, 403);
        }

        const getAppInstance = auth.elevate(appInstances.getAppInstance);
        const { instance } = await getAppInstance();
        const planName = instance?.billing?.packageName?.trim().toLowerCase() ?? '';
        if (!planName.includes('essential')) {
            return jsonResponse({ success: false, error: 'Automatic sign-in is only available on the Essentials plan' }, 403);
        }

        const queryAgents = auth.elevate(items.query);
        const result = await queryAgents(CollectionIds.AGENTS)
            .include('team', 'role')
            .limit(2)
            .find();
        if (result.items.length !== 1) {
            return jsonResponse({ success: false, error: 'Essentials requires exactly one configured administrator account' }, 409);
        }

        const agent = result.items[0] as Agent | undefined;
        const agentId = agent?._id;
        const teamId = agent?.team?._id;
        const roleId = agent?.role?._id;
        if (!agent || !agentId || !teamId || !roleId) {
            return jsonResponse({ success: false, error: 'The administrator account is incomplete' }, 409);
        }

        const session = await issueToken({ agentId, teamId, roleId });
        return jsonResponse({
            success: true,
            user: {
                agentId,
                teamId,
                roleId,
                name: agent.name,
                teamName: agent.team.name ?? '',
                roleName: agent.role.roleName ?? '',
                permissions: agent.role.permissions ?? [],
                agentProfilePictureUrl: agent.profilePictureUrl ?? '',
            },
            authToken: session.token,
            authTokenExpiresAt: session.expiresAt,
        });
    } catch (error) {
        console.error('Failed to create Essentials administrator session', error);
        return jsonResponse({ success: false, error: 'Unable to start the Essentials administrator session' }, 500);
    }
};

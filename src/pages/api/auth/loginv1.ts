import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { CollectionIds, type Agent } from '@jrapps/my_tickets_common_types';
import { captureError } from '../reportError';
import { issueToken } from '../my-tickets-auth/token';
import { ADMIN_PERMISSIONS } from './admin-permissions';
import { verifyPassword } from './password-utils';
import { SYSTEM_ADMIN_EMAIL, SYSTEM_ADMIN_ID } from './system-admin';

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

interface LoginAgent extends Agent {
    _id: string;
    loginFailedAttempts?: number;
    loginFailureWindow?: number;
    loginLockedUntil?: number;
}

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const body = await request.json() as { email?: unknown; userId?: unknown };
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        const userId = typeof body.userId === 'string' ? body.userId : '';
        if (!email || !userId) {
            status = 400;
            throw new Error('Email and User ID are required');
        }

        if (email === SYSTEM_ADMIN_EMAIL && userId === 'admin') {
            const { token, expiresAt } = await issueToken({
                agentId: SYSTEM_ADMIN_ID,
                teamId: SYSTEM_ADMIN_ID,
                roleId: SYSTEM_ADMIN_ID,
            });
            return new Response(JSON.stringify({
                success: true,
                teamId: SYSTEM_ADMIN_ID,
                agentId: SYSTEM_ADMIN_ID,
                permissions: ADMIN_PERMISSIONS,
                isSystemAdmin: true,
                authToken: token,
                authTokenExpiresAt: expiresAt,
                name: 'System',
                roleId: SYSTEM_ADMIN_ID,
                roleName: 'System Admin',
                teamName: '',
                agentProfilePictureUrl: '',
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            });
        }

        const elevatedQuery = auth.elevate(items.query);
        const results = await elevatedQuery(CollectionIds.AGENTS)
            .eq('email', email)
            .include('team', 'role')
            .limit(1)
            .find();

        const user = results.items[0] as LoginAgent | undefined;
        if (!user?._id) {
            status = 401;
            throw new Error('Invalid email or User ID');
        }

        const now = Date.now();
        if (Number(user.loginLockedUntil ?? 0) > now) {
            status = 401;
            throw new Error('Invalid email or User ID');
        }

        if (!user.userId || (!user.userId.includes(':') && !user.userId.startsWith('$2'))) {
            status = 400;
            throw new Error('Account required password reset.');
        }

        const isValid = await verifyPassword(userId, user.userId);
        if (!isValid) {
            await recordFailedLogin(user, now);
            status = 401;
            throw new Error('Invalid email or User ID');
        }

        await clearFailedLogins(user._id);

        const teamId = user.team?._id;
        const roleId = user.role?._id;
        if (!teamId || !roleId) {
            status = 404;
            throw new Error('Team or role not found for the user');
        }

        const getTeam = auth.elevate(items.get);
        const team = await getTeam(CollectionIds.TEAMS, teamId);
        if (!team) {
            status = 404;
            throw new Error('Team not found for the user');
        }

        const { token, expiresAt } = await issueToken({ agentId: user._id, teamId, roleId });
        return new Response(JSON.stringify({
            success: true,
            teamId,
            agentId: user._id,
            permissions: user.role?.permissions ?? [],
            authToken: token,
            authTokenExpiresAt: expiresAt,
            name: user.name,
            roleId,
            roleName: user.role?.roleName,
            teamName: user.team?.name,
            agentProfilePictureUrl: user.profilePictureUrl ?? '',
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
    } catch (error: unknown) {
        let requestId = locals.myTicketsRequestId;
        if (status >= 500) {
            ({ requestId } = await captureError(error, { requestId, request }));
        }
        return new Response(JSON.stringify({ success: false, error: 'Error logging in' }), {
            status,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                ...(requestId ? { 'x-mytickets-request-id': requestId } : {}),
            },
        });
    }
};

async function recordFailedLogin(user: LoginAgent, now: number): Promise<void> {
    const windowId = Math.floor(now / LOGIN_WINDOW_MS);
    const sameWindow = Number(user.loginFailureWindow ?? -1) === windowId;
    const expectedAttempts = sameWindow ? Number(user.loginFailedAttempts ?? 0) + 1 : 1;
    const patch = auth.elevate(items.patch)(CollectionIds.AGENTS, user._id);

    if (sameWindow) {
        patch.incrementField('loginFailedAttempts', 1);
    } else {
        patch
            .setField('loginFailureWindow', windowId)
            .setField('loginFailedAttempts', 1)
            .setField('loginLockedUntil', 0);
    }

    const updatedUser = await patch.run() as LoginAgent;
    const attempts = Number(updatedUser.loginFailedAttempts ?? expectedAttempts);
    if (attempts >= LOGIN_ATTEMPT_LIMIT) {
        await auth.elevate(items.patch)(CollectionIds.AGENTS, user._id)
            .setField('loginLockedUntil', (windowId + 1) * LOGIN_WINDOW_MS)
            .run();
    }
}

async function clearFailedLogins(agentId: string): Promise<void> {
    await auth.elevate(items.patch)(CollectionIds.AGENTS, agentId)
        .setField('loginFailedAttempts', 0)
        .setField('loginFailureWindow', 0)
        .setField('loginLockedUntil', 0)
        .run();
}

import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { CollectionIds, type Agent, type Role, type Team } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';
import { generateSalt, hashPassword } from '../auth/password-utils';
import { issueToken } from '../my-tickets-auth/token';
import { PERMISSIONS } from '../../../extensions/dashboard/pages/my-tickets/Permissions/Permissions';
import { captureError } from '../reportError';

const ROLE_NAME = 'Main Administrator';
const TEAM_NAME = 'Main Team';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const authorized = await checkPermission(request.headers.get('Authorization'), ['USER']);
        if (!authorized) return json({ success: false, error: 'Forbidden' }, 403);

        const { name, email, password } = await request.json();
        const cleanName = typeof name === 'string' ? name.trim() : '';
        const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (!cleanName || !cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || typeof password !== 'string' || password.length < 8) {
            return json({ success: false, error: 'Enter a name, valid email, and password with at least 8 characters.' }, 400);
        }

        const existingAgents = await items.query(CollectionIds.AGENTS).limit(1).find();
        if (existingAgents.items.length > 0) return json({ success: false, error: 'An agent account already exists. Onboarding is complete.' }, 409);

        const role = await findOrCreate<Role>(CollectionIds.ROLES, 'roleName', ROLE_NAME, {
            roleName: ROLE_NAME,
            roleDescription: 'Full access to all My Tickets features and settings.',
            permissions: PERMISSIONS.map(({ id }) => id),
        });
        const team = await findOrCreate<Team>(CollectionIds.TEAMS, 'name', TEAM_NAME, {
            name: TEAM_NAME,
            description: 'Default team for the main administrator.',
            email: 'mainteam@mytickets.internal',
        });

        const salt = await generateSalt();
        const userId = await hashPassword(password, salt);
        const elevatedInsert = auth.elevate(items.insert);
        const agent = await elevatedInsert(CollectionIds.AGENTS, {
            name: cleanName,
            email: cleanEmail,
            userId,
            role: { _id: role._id },
            team: { _id: team._id },
        } as Agent);
        const identity = { agentId: agent._id!, teamId: team._id!, roleId: role._id! };
        const session = await issueToken(identity);

        return json({
            success: true,
            user: {
                ...identity,
                name: cleanName,
                teamName: team.name,
                roleName: role.roleName,
                permissions: role.permissions,
                agentProfilePictureUrl: '',
            },
            authToken: session.token,
            authTokenExpiresAt: session.expiresAt,
        }, 201);
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Could not complete setup. Please try again.' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'x-mytickets-request-id': requestId,
            },
        });
    }
};

async function findOrCreate<T extends { _id?: string }>(collection: string, field: string, value: string, data: T): Promise<T> {
    const result = await items.query(collection).eq(field, value).limit(1).find();
    if (result.items[0]) return result.items[0] as T;
    return await items.insert<T>(collection, data) as unknown as T;
}

const json = (body: Record<string, unknown>, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

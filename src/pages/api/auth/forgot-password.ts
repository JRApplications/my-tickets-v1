import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { captureError } from '../reportError';
import { items } from '@wix/data';
import { notificationsV3 } from '@wix/notifications';
import { auth } from '@wix/essentials';
import { RESET_SECRET } from 'astro:env/server';
import { CollectionIds, ExtensionIds } from '@jrapps/my_tickets_common_types';

const RESET_EXPIRY_MS = 15 * 60 * 1000;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_RESET_ATTEMPTS = 5;

interface ResetAgent {
    _id: string;
    name?: string;
    resetChallengeId?: string;
    resetCodeHash?: string;
    resetExpiresAt?: number;
    resetAttempts?: number;
    resetRequestedAt?: number;
}

const resetResponse = (challengeId: string) => new Response(JSON.stringify({
    success: true,
    message: 'If an account exists for this email, a reset code has been sent.',
    challengeId,
}), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export const POST: APIRoute = async ({ request, locals }) => {
    let challengeId = randomUUID();
    try {
        const body = await request.json() as { email?: unknown };
        const email = typeof body.email === 'string' ? body.email.trim() : '';
        if (!email || email.length > 320) return resetResponse(challengeId);

        const agent = await findAgentByEmail(email);
        if (!agent) return resetResponse(challengeId);

        const now = Date.now();
        const previousRequestAt = Number(agent.resetRequestedAt ?? 0);
        if (now - previousRequestAt < RESET_RESEND_COOLDOWN_MS) {
            const activeChallengeId = typeof agent.resetChallengeId === 'string' ? agent.resetChallengeId : '';
            const activeChallenge = Boolean(activeChallengeId)
                && Number(agent.resetExpiresAt ?? 0) > now
                && Number(agent.resetAttempts ?? 0) < MAX_RESET_ATTEMPTS;
            return resetResponse(activeChallenge ? activeChallengeId : challengeId);
        }

        challengeId = randomUUID();
        const accessCode = generateAccessCode();
        const expiry = now + RESET_EXPIRY_MS;
        const codeHash = await hashResetCode(accessCode);

        await patchAgent(agent._id)
            .setField('resetChallengeId', challengeId)
            .setField('resetCodeHash', codeHash)
            .setField('resetExpiresAt', expiry)
            .setField('resetAttempts', 0)
            .setField('resetRequestedAt', now)
            .run();

        try {
            const elevatedNotify = auth.elevate(notificationsV3.notify);
            const response = await elevatedNotify(ExtensionIds.RESET_PASSWORD_NOTIFICATION, {
                dynamicValues: {
                    UserName: { text: agent.name ?? '' },
                    AccessCode: { text: accessCode },
                },
            });
            if (!response) throw new Error('Failed to send password reset notification');
        } catch (error) {
            await clearResetState(agent._id, true);
            throw error;
        }

        return resetResponse(challengeId);
    } catch (error) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        console.error('Password reset request failed', { requestId });
        // Keep the response indistinguishable for known and unknown email addresses.
        return resetResponse(randomUUID());
    }
};

async function findAgentByEmail(email: string): Promise<ResetAgent | null> {
    const elevatedQuery = auth.elevate(items.query);
    const result = await elevatedQuery(CollectionIds.AGENTS)
        .eq('email', email)
        .fields('_id', 'name', 'resetChallengeId', 'resetExpiresAt', 'resetAttempts', 'resetRequestedAt')
        .limit(1)
        .find();
    return (result.items[0] as ResetAgent | undefined) ?? null;
}

async function findAgentByChallengeId(challengeId: string): Promise<ResetAgent | null> {
    const elevatedQuery = auth.elevate(items.query);
    const result = await elevatedQuery(CollectionIds.AGENTS)
        .eq('resetChallengeId', challengeId)
        .fields('_id', 'email', 'resetChallengeId', 'resetCodeHash', 'resetExpiresAt', 'resetAttempts')
        .limit(1)
        .find();
    return (result.items[0] as ResetAgent | undefined) ?? null;
}

export function patchAgent(agentId: string) {
    return auth.elevate(items.patch)(CollectionIds.AGENTS, agentId);
}

export async function clearResetState(agentId: string, clearCooldown = false): Promise<void> {
    const patch = patchAgent(agentId)
        .setField('resetChallengeId', '')
        .setField('resetCodeHash', '')
        .setField('resetExpiresAt', 0)
        .setField('resetAttempts', 0);
    if (clearCooldown) patch.setField('resetRequestedAt', 0);
    await patch.run();
}

async function hashResetCode(code: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(RESET_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(code.trim().toUpperCase()));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hashesMatch(left: string, right: string): boolean {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
        difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }
    return difference === 0;
}

export async function verifyResetChallenge(
    challengeId: string,
    code: string,
): Promise<{ valid: boolean; agentId?: string }> {
    if (!challengeId || !code || challengeId.length > 100 || code.length > 100) return { valid: false };

    const agent = await findAgentByChallengeId(challengeId);
    if (!agent || agent.resetChallengeId !== challengeId) return { valid: false };

    const now = Date.now();
    const attempts = Number(agent.resetAttempts ?? 0);
    if (Number(agent.resetExpiresAt ?? 0) <= now || attempts >= MAX_RESET_ATTEMPTS) {
        await clearResetState(agent._id);
        return { valid: false };
    }

    const submittedHash = await hashResetCode(code);
    if (!agent.resetCodeHash || !hashesMatch(submittedHash, agent.resetCodeHash)) {
        const updatedAgent = await patchAgent(agent._id).incrementField('resetAttempts', 1).run();
        const nextAttempts = Number(updatedAgent.resetAttempts ?? attempts + 1);
        if (nextAttempts >= MAX_RESET_ATTEMPTS) {
            await clearResetState(agent._id);
        }
        return { valid: false };
    }

    return { valid: true, agentId: agent._id };
}

function generateAccessCode(length = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

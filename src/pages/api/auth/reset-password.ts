import type { APIRoute } from 'astro';
import { auth } from '@wix/essentials';
import { items } from '@wix/data';
import { verifyResetChallenge } from './forgot-password';
import { hashPassword, generateSalt } from './password-utils';
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';

interface ResetPasswordRequest {
    challengeId: string;
    code: string;
    newPassword: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const { challengeId, code, newPassword } = await request.json() as ResetPasswordRequest;

        if (!challengeId || typeof challengeId !== 'string') {
            status = 400;
            throw new Error('Valid challenge is required');
        }
        if (!code || typeof code !== 'string') {
            status = 400;
            throw new Error('Valid code is required');
        }
        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
            status = 400;
            throw new Error('New password must be at least 8 characters');
        }

        const result = await verifyResetChallenge(challengeId, code);

        if (!result.valid || !result.agentId) {
            status = 400;
            throw new Error('Invalid or expired code');
        }

        // Hash the new password and update the user record
        const salt = await generateSalt();
        const hashedPassword = await hashPassword(newPassword, salt);
        const elevatedPatch = auth.elevate(items.patch);
        await elevatedPatch(CollectionIds.AGENTS, result.agentId)
            .setField('userId', hashedPassword)
            .setField('resetChallengeId', '')
            .setField('resetCodeHash', '')
            .setField('resetExpiresAt', 0)
            .setField('resetAttempts', 0)
            .run();

        return new Response(JSON.stringify({ success: true }), {
            "status": 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: error.message || 'Error resetting password' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId,
            },
        });
    }
};

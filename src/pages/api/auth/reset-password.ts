import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { verifyResetToken } from './forgot-password';
import { hashPassword, generateSalt } from './password-utils';
import { captureError } from '../reportError';
import { CollectionIds } from '@jrapps/my_tickets_common_types';

interface ResetPasswordRequest {
    token: string;
    code: string;
    newPassword: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const { token, code, newPassword } = await request.json() as ResetPasswordRequest;

        if (!token || typeof token !== 'string') {
            status = 400;
            throw new Error('Valid token is required');
        }
        if (!code || typeof code !== 'string') {
            status = 400;
            throw new Error('Valid code is required');
        }
        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
            status = 400;
            throw new Error('New password must be at least 6 characters');
        }

        const hashedCode = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
        const codeHash = Array.from(new Uint8Array(hashedCode)).map(b => b.toString(16).padStart(2, '0')).join('');

        const result = await verifyResetToken(token, codeHash);

        if (!result.valid || !result.user) {
            status = 400;
            throw new Error('Invalid or expired code');
        }

        // Hash the new password and update the user record
        const salt = await generateSalt();
        const hashedPassword = await hashPassword(newPassword, salt);
        await items.patch(CollectionIds.AGENTS, result.user.agentId).setField('userId', hashedPassword).run();

        return new Response(JSON.stringify({ success: true, user: result.user }), {
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

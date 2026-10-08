import type { APIRoute } from 'astro';
import { verifyResetToken } from './forgot-password';
import { captureError } from '../reportError';

interface ResetCodeRequest {
    token: string;
    code: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const { token, code } = await request.json() as ResetCodeRequest;

        if (!token || typeof token !== 'string') {
            status = 400;
            throw new Error('Valid token is required');
        }
        if (!code || typeof code !== 'string') {
            status = 400;
            throw new Error('Valid code is required');
        }

        const hashedCode = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
        const codeHash = Array.from(new Uint8Array(hashedCode)).map(b => b.toString(16).padStart(2, '0')).join('');

        const result = await verifyResetToken(token, codeHash);

        if (result.valid) {
            return new Response(JSON.stringify({ success: true, user: result.user }), { status: 200, headers: { "Content-Type": "application/json" } });
        } else {
            status = 400;
            throw new Error('Invalid or expired code');
        }
    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({ success: false, error: 'Error verifying reset code' }), {
            "status": status,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
};

import type { APIRoute } from 'astro';
import { verifyResetChallenge } from './forgot-password';
import { captureError } from '../reportError';

interface ResetCodeRequest {
    challengeId: string;
    code: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
    let status = 500;
    try {
        const { challengeId, code } = await request.json() as ResetCodeRequest;

        if (!challengeId || typeof challengeId !== 'string') {
            status = 400;
            throw new Error('Valid challenge is required');
        }
        if (!code || typeof code !== 'string') {
            status = 400;
            throw new Error('Valid code is required');
        }

        const result = await verifyResetChallenge(challengeId, code);

        if (result.valid) {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            });
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

import type { APIRoute } from 'astro';
import { BASE_44_MY_TICKETS_BACKEND_MANAGER } from "astro:env/server";
import { captureError } from '../reportError';

const base44Endpoint = 'https://app.base44.com/api/apps/6ab30e3df51d30247532f059/entities/SupportSubmission';
const requestTypes = new Set(['support', 'bug', 'feature', 'feedback']);
const priorities = new Set(['low', 'normal', 'high', 'urgent']);

interface GetSupportSubmission {
    type?: unknown;
    name?: unknown;
    email?: unknown;
    subject?: unknown;
    message?: unknown;
    priority?: unknown;
}

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

const jsonResponse = (
    body: Record<string, unknown>,
    status: number,
    requestId?: string,
) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...(requestId ? { 'x-mytickets-request-id': requestId } : {}),
        },
    });

export const POST: APIRoute = async ({ request, locals }) => {
    let submission: GetSupportSubmission;

    try {
        submission = await request.json() as GetSupportSubmission;
    } catch (error) {
        const { requestId } = await captureError(error, {
            requestId: locals.myTicketsRequestId,
            request,
        });
        return jsonResponse(
            { success: false, error: 'Request body must be valid JSON.' },
            400,
            requestId,
        );
    }

    if (
        !submission ||
        typeof submission !== 'object' ||
        typeof submission.type !== 'string' ||
        !requestTypes.has(submission.type) ||
        !isNonEmptyString(submission.name) ||
        !isNonEmptyString(submission.email) ||
        !isNonEmptyString(submission.subject) ||
        !isNonEmptyString(submission.message) ||
        (submission.priority !== undefined && !priorities.has(String(submission.priority)))
    ) {
        return jsonResponse(
            {
                success: false,
                error: 'A valid request type, name, email, subject, and message are required. Priority must be low, normal, high, or urgent.',
            },
            400,
        );
    }

    const accessToken = BASE_44_MY_TICKETS_BACKEND_MANAGER;
    if (!accessToken) {
        console.error('[get-support] BASE44_PERSONAL_ACCESS_TOKEN is not configured.');
        return jsonResponse(
            { success: false, error: 'Support submission is not configured. Please try again later.' },
            500,
        );
    }

    const base44Payload = {
        type: submission.type,
        name: submission.name.trim(),
        email: submission.email.trim(),
        subject: submission.subject.trim(),
        message: submission.message.trim(),
        ...(priorities.has(String(submission.priority)) ? { priority: submission.priority } : {}),
    };

    try {
        const response = await fetch(base44Endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(base44Payload),
        });

        if (!response.ok) {
            console.error('[get-support] Base44 rejected submission', { status: response.status });
            return jsonResponse(
                { success: false, error: 'Unable to submit your request. Please try again.' },
                502,
            );
        }

        console.info('[get-support] Submission forwarded to Base44', { type: base44Payload.type });
        return jsonResponse({ success: true }, 200);
    } catch (error) {
        console.error('[get-support] Failed to reach Base44', error);
        const { requestId } = await captureError(error, {
            requestId: locals.myTicketsRequestId,
            request,
        });
        return jsonResponse(
            { success: false, error: 'Unable to submit your request. Please try again.' },
            502,
            requestId,
        );
    }
};
import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { CollectionIds } from '@jrapps/my_tickets_common_types';

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        if (!locals.myTicketsIdentity?.agentId) {
            return new Response(JSON.stringify({ success: false, error: 'Agent authentication is required' }), { status: 401 });
        }
        const { submissionId, status } = await request.json() as { submissionId?: unknown; status?: unknown };
        if (typeof submissionId !== 'string' || !submissionId || (status !== 'seen' && status !== 'resolved')) {
            return new Response(JSON.stringify({ success: false, error: 'A submission and valid status are required' }), { status: 400 });
        }
        const submission = await auth.elevate(items.get)(CollectionIds.OFFLINE_FORM_SUBMISSIONS, submissionId);
        if (!submission) return new Response(JSON.stringify({ success: false, error: 'Submission not found' }), { status: 404 });

        const nextValue = status === 'seen' ? !submission.isSeen : !submission.isResolved;
        const updates = status === 'seen'
            ? { ...submission, isSeen: nextValue, seenAt: nextValue ? new Date() : null }
            : { ...submission, isResolved: nextValue, resolvedAt: nextValue ? new Date() : null };
        await auth.elevate(items.update)(CollectionIds.OFFLINE_FORM_SUBMISSIONS, updates);
        return new Response(JSON.stringify({ success: true, [status === 'seen' ? 'isSeen' : 'isResolved']: nextValue }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Failed to update offline form submission', error);
        return new Response(JSON.stringify({ success: false, error: 'Unable to update submission' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

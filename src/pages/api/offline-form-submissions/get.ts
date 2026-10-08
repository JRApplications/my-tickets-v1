import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { CollectionIds } from '@jrapps/my_tickets_common_types';

export const GET: APIRoute = async ({ locals }) => {
    try {
        if (!locals.myTicketsIdentity?.agentId) {
            return new Response(JSON.stringify({ success: false, error: 'Agent authentication is required' }), { status: 401 });
        }
        const result = await auth.elevate(items.query)(CollectionIds.OFFLINE_FORM_SUBMISSIONS)
            .descending('_createdDate')
            .limit(100)
            .find();
        return new Response(JSON.stringify({ success: true, submissions: result.items }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Failed to fetch offline form submissions', error);
        return new Response(JSON.stringify({ success: false, error: 'Unable to load submissions' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

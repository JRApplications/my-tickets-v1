import type { APIRoute } from 'astro';
import { items } from '@wix/data';
import { CollectionIds } from '@jrapps/my_tickets_common_types';
import { checkPermission } from '../auth/checkPermission';

export const GET: APIRoute = async ({ request }) => {
    try {
        const authorized = await checkPermission(request.headers.get('Authorization'), ['USER']);
        if (!authorized) return json({ success: false, error: 'Forbidden' }, 403);

        const result = await items.query(CollectionIds.AGENTS).limit(1).find();
        return json({ success: true, needsSetup: result.items.length === 0 }, 200);
    } catch {
        return json({ success: false, error: 'Could not check onboarding status' }, 500);
    }
};

const json = (body: Record<string, unknown>, status: number) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

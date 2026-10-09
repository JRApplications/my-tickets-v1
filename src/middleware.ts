// middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { captureError, flushSentry } from './monitoring/sentry';
import { HEADER_NAME, verifyToken } from './pages/api/my-tickets-auth/token';
import { agentHasRequestPermission } from './pages/api/auth/agent-api-permissions';
import crypto from 'crypto';

const agentDashboardApiPrefixes = [
    '/api/agents', '/api/tickets', '/api/teams', '/api/roles', '/api/chat-admin',
    '/api/internal-mail', '/api/members', '/api/notifications', '/api/workforce',
    '/api/sidebar-ai', '/api/chat-settings', '/api/using-my-tickets',
    '/api/get-support', '/api/mini-ai', '/api/reports', '/api/offline-form-submissions',
];

const errorResponse = (requestId: string) => new Response(
    JSON.stringify({ success: false, error: 'Internal server error' }),
    {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
            'Content-Type': 'application/json',
            'x-mytickets-request-id': requestId,
        },
    },
);

export const onRequest = defineMiddleware(async (context, next) => {
    const requestId = context.request.headers.get('x-mytickets-request-id')
        ?? crypto.randomUUID().replace(/-/g, '');
    context.locals.myTicketsRequestId = requestId;

    try {
        const pathname = new URL(context.request.url).pathname;
        if (agentDashboardApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
            const token = context.request.headers.get(HEADER_NAME);
            if (!token) {
                return new Response(JSON.stringify({ success: false, error: 'My Tickets agent authentication is required' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
                });
            }
            try {
                const identity = await verifyToken(token);
                context.locals.myTicketsIdentity = {
                    agentId: identity.agentId,
                    teamId: identity.teamId,
                    roleId: identity.roleId,
                };
            } catch {
                return new Response(JSON.stringify({ success: false, error: 'Invalid or expired My Tickets agent token' }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
                });
            }
            if (!(await agentHasRequestPermission(context.locals.myTicketsIdentity, context.request))) {
                return new Response(JSON.stringify({ success: false, error: 'Insufficient My Tickets agent permissions' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json', 'x-mytickets-request-id': requestId },
                });
            }
        }

        const response = await next();
        response.headers.set('x-mytickets-request-id', requestId);
        if (response.status >= 400) {
            const flushed = await flushSentry();
            if (!flushed) {
                console.error('Sentry event was not confirmed as delivered:', { requestId, path: new URL(context.request.url).pathname });
            }
        }
        return response;
    } catch (error) {
        console.error('Unhandled endpoint error:', error);
        await captureError(error, { requestId, request: context.request });
        const flushed = await flushSentry();
        if (!flushed) {
            console.error('Sentry event was not confirmed as delivered:', { requestId, path: new URL(context.request.url).pathname });
        }
        return errorResponse(requestId);
    }
});

import type { APIContext, APIRoute as WixAPIRoute } from '@wix/custom-extensions/types';
import { agentHasRequestPermission } from './auth/agent-api-permissions';
import { verifyToken, HEADER_NAME } from './my-tickets-auth/token';
import { captureError, flushSentry } from '../monitoring/sentry';

export interface MyTicketsIdentity {
  agentId: string;
  teamId: string;
  roleId: string;
}

interface MyTicketsLocals {
  myTicketsRequestId?: string;
  myTicketsIdentity?: MyTicketsIdentity;
}

export type APIRoute = (
  context: APIContext & { locals: APIContext['locals'] & MyTicketsLocals },
) => ReturnType<WixAPIRoute>;

const endpointRoots = new Set([
  'agents', 'aiUtils', 'attachments', 'auth', 'chat', 'chat-admin', 'chat-settings',
  'check-app-permission', 'get-support', 'help-modal', 'internal-mail', 'members',
  'memberTickets', 'mini-ai', 'my-tickets-auth', 'notifications', 'offline-form',
  'offline-form-submissions', 'onboarding', 'reports', 'roles', 'sidebar-ai', 'sla',
  'sla-settings', 'teams', 'tickets', 'using-my-tickets', 'utils', 'workforce',
]);

export const getSiblingEndpointUrl = (path: string, requestUrl: string): URL => {
  const request = new URL(requestUrl);
  const pathSegments = request.pathname.split('/').filter(Boolean);
  const endpointRootIndex = pathSegments.findIndex((segment) => endpointRoots.has(segment));
  const serverBasePath = endpointRootIndex > 0
    ? `/${pathSegments.slice(0, endpointRootIndex).join('/')}`
    : '';
  const endpointPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(`${serverBasePath}${endpointPath}`, request.origin);
};

const getEndpointPathname = (pathname: string): string => {
  const pathSegments = pathname.split('/').filter(Boolean);
  const endpointRootIndex = pathSegments.findIndex((segment) => endpointRoots.has(segment));
  return endpointRootIndex >= 0 ? `/${pathSegments.slice(endpointRootIndex).join('/')}` : pathname;
};

const agentDashboardApiPrefixes = [
  '/agents', '/tickets', '/teams', '/roles', '/chat-admin',
  '/internal-mail', '/members', '/notifications', '/workforce',
  '/sidebar-ai', '/chat-settings', '/using-my-tickets',
  '/get-support', '/mini-ai', '/reports', '/offline-form-submissions',
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

const authErrorResponse = (requestId: string, status: 401 | 403, error: string) => new Response(
  JSON.stringify({ success: false, error }),
  {
    status,
    headers: {
      'Content-Type': 'application/json',
      'x-mytickets-request-id': requestId,
    },
  },
);

export const withApiMiddleware = (handler: APIRoute): APIRoute => async (context) => {
  const requestId = context.request.headers.get('x-mytickets-request-id')
    ?? crypto.randomUUID().replace(/-/g, '');
  context.locals.myTicketsRequestId = requestId;

  try {
    const pathname = getEndpointPathname(context.url.pathname);
    if (agentDashboardApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      const token = context.request.headers.get(HEADER_NAME);
      if (!token) {
        return authErrorResponse(requestId, 401, 'My Tickets agent authentication is required');
      }

      let myTicketsIdentity: NonNullable<MyTicketsLocals['myTicketsIdentity']>;
      try {
        const identity = await verifyToken(token);
        myTicketsIdentity = {
          agentId: identity.agentId,
          teamId: identity.teamId,
          roleId: identity.roleId,
        };
      } catch {
        return authErrorResponse(requestId, 401, 'Invalid or expired My Tickets agent token');
      }
      context.locals.myTicketsIdentity = myTicketsIdentity;
      if (!(await agentHasRequestPermission(myTicketsIdentity, context.request))) {
        return authErrorResponse(requestId, 403, 'Insufficient My Tickets agent permissions');
      }
    }

    const response = await handler(context);
    response.headers.set('x-mytickets-request-id', requestId);
    if (response.status >= 400) {
      const flushed = await flushSentry();
      if (!flushed) {
        console.error('Sentry event was not confirmed as delivered:', { requestId, path: pathname });
      }
    }
    return response;
  } catch (error) {
    console.error('Unhandled endpoint error:', error);
    await captureError(error, { requestId, request: context.request });
    const flushed = await flushSentry();
    if (!flushed) {
      console.error('Sentry event was not confirmed as delivered:', { requestId, path: context.url.pathname });
    }
    return errorResponse(requestId);
  }
};

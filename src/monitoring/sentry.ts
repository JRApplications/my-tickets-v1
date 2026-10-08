// sentry.ts
import * as Sentry from '@sentry/browser';
import { SENTRY_DSN } from 'astro:env/server';

let initialized = false;
let configurationWarningLogged = false;

const sensitiveHeaderNames = new Set([
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-wix-access-token',
]);

const sentryProjectId = () => {
    try {
        const pathSegments = new URL(SENTRY_DSN).pathname.split('/').filter(Boolean);
        return pathSegments[pathSegments.length - 1] ?? 'unknown';
    } catch {
        return 'unknown';
    }
};

const sentryTransportFetch: typeof fetch = async (input, init) => {
    try {
        const response = await fetch(input, init);

        return response;
    } catch (error) {
        console.error('Sentry ingest request failed:', error);
        throw error;
    }
};

const sanitizeBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
    if (breadcrumb.category !== 'fetch' || typeof breadcrumb.data?.url !== 'string') {
        return breadcrumb;
    }

    try {
        const url = new URL(breadcrumb.data.url);
        if (url.hostname !== 'www.wixapis.com' || !url.pathname.startsWith('/oauth2/')) {
            return breadcrumb;
        }

        const operation = url.pathname.endsWith('/token-info')
            ? 'wix-oauth-credential-inspection'
            : 'wix-oauth-credential-exchange';

        return {
            ...breadcrumb,
            data: {
                ...breadcrumb.data,
                url: operation,
            },
        };
    } catch {
        return breadcrumb;
    }
};

const initializeSentry = () => {
    if (initialized) {
        return true;
    }

    if (!SENTRY_DSN) {
        if (!configurationWarningLogged) {
            console.error('Sentry is disabled: the SENTRY_DSN server environment variable is not configured.');
            configurationWarningLogged = true;
        }
        return false;
    }

    try {
        Sentry.init({
            dsn: SENTRY_DSN,
            environment: import.meta.env.DEV ? 'development' : 'production',
            tracesSampleRate: 0.1,
            sendDefaultPii: false,
            // The default Dedupe integration silently drops consecutive events
            // that share the same stack trace/fingerprint (e.g. the same error
            // firing on every request to a broken endpoint). That's useful for
            // avoiding noisy client-side error loops, but here it means only
            // the first occurrence of a repeated server error ever reaches
            // Sentry - every identical repeat gets swallowed before it hits
            // beforeSend or the transport. Remove it so every captured error
            // is actually sent.
            integrations: (integrations) => integrations.filter((integration) => integration.name !== 'Dedupe'),
            transport: (options) => Sentry.makeFetchTransport(options, sentryTransportFetch),
            beforeBreadcrumb: sanitizeBreadcrumb,
            beforeSend(event) {
                if (event.request?.headers) {
                    event.request.headers = Object.fromEntries(
                        Object.entries(event.request.headers).map(([name, value]) => [
                            name,
                            sensitiveHeaderNames.has(name.toLowerCase()) ? '[Filtered]' : value,
                        ]),
                    );
                }

                if (event.request) {
                    delete event.request.data;
                    delete event.request.cookies;
                }

                return event;
            },
        });
        initialized = Sentry.isInitialized();
        if (initialized) {
            console.info('Sentry initialized:', {
                environment: import.meta.env.DEV ? 'development' : 'production',
                projectId: sentryProjectId(),
            });
        }
    } catch (error) {
        console.error('Sentry initialization failed:', error);
    }

    return initialized;
};

interface ErrorContext {
    requestId?: string;
    request?: Request;
}

// Wix API errors surface their own request id under one of these paths depending on the SDK call site,
// or in the "x-wix-request-id" header of the raw response attached to the error.
const extractWixRequestId = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object') {
        return undefined;
    }

    const details = (error as { details?: Record<string, unknown> }).details;
    const applicationErrorData = (details?.applicationError as { data?: Record<string, unknown> } | undefined)?.data;
    const response = (error as { response?: { headers?: Headers } }).response;

    return (
        (applicationErrorData?.requestId as string | undefined)
        ?? (details?.requestId as string | undefined)
        ?? (error as { requestId?: string }).requestId
        ?? response?.headers?.get?.('x-wix-request-id')
        ?? undefined
    );
};

export const captureError = async (error: unknown, context: ErrorContext = {}) => {
    const requestId = context.requestId ?? crypto.randomUUID().replace(/-/g, '');
    const wixRequestId = extractWixRequestId(error);
    if (!initializeSentry()) {
        return { requestId, eventId: undefined, captured: false };
    }

    try {
        const requestUrl = context.request ? new URL(context.request.url) : undefined;
        const errorDetails = error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : { name: typeof error, message: String(error) };
        console.error('[Sentry] Capturing API error', {
            requestId,
            wixRequestId,
            method: context.request?.method,
            path: requestUrl?.pathname,
            error: errorDetails,
        });

        const eventId = Sentry.withScope((scope) => {
            scope.setLevel('error');
            scope.setTag('x-mytickets-request-id', requestId);

            if (wixRequestId) {
                scope.setTag('wix-request-id', wixRequestId);
                scope.setContext('wix', { requestId: wixRequestId });
            }

            if (context.request) {
                const url = new URL(context.request.url);
                const agentAuthToken = context.request.headers.get('x-my-tickets-auth');
                scope.setTag('http.method', context.request.method);
                scope.setTag('http.route', url.pathname);
                scope.setContext('http', {
                    method: context.request.method,
                    path: url.pathname,
                });
                if (agentAuthToken) {
                    scope.addEventProcessor((event) => {
                        event.request = {
                            ...event.request,
                            headers: {
                                ...event.request?.headers,
                                'x-my-tickets-auth': agentAuthToken,
                            },
                        };
                        return event;
                    });
                }
            }

            return Sentry.captureException(error);
        });

        return { requestId, eventId, captured: true };
    } catch (captureFailure) {
        console.error('Sentry failed to capture an endpoint error:', captureFailure);
        return { requestId, eventId: undefined, captured: false };
    }
};

export const flushSentry = async () => {
    if (!initialized) {
        return false;
    }

    try {
        return await Sentry.flush(2_000);
    } catch (error) {
        console.error('Sentry flush failed:', error);
        return false;
    }
};

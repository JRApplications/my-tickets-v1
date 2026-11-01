# Sentry monitoring setup

This document describes the Sentry setup currently used by this app and how to adapt the pattern for another server-rendered app. The implementation uses `@sentry/browser` 11.x from a server-only Astro module and the Wix hosting adapter.

## What is monitored

- API route exceptions explicitly passed to `captureError()`.
- Exceptions that escape request handling and reach the global Astro middleware.
- Sentry delivery failures and initialization failures are logged to the application console.
- Middleware assigns a request ID to each request and returns it in `x-mytickets-request-id`, including on handled 500 responses.

An ordinary HTTP response with status 4xx/5xx is not itself captured as a Sentry exception by the middleware. The middleware flushes already-captured events for responses with status 400 or higher. Route code must call `captureError()` when it catches an error it wants recorded.

## Dependencies and configuration

The app depends on `@sentry/browser` (currently `^11.6.0`). Astro declares the DSN as a server-only secret:

```js
// astro.config.mjs
import { envField } from 'astro/config';

env: {
  schema: {
    SENTRY_DSN: envField.string({ context: 'server', access: 'secret' }),
  },
}
```

Set `SENTRY_DSN` to the project DSN in the local server environment and in the hosting provider's production secrets. Do not commit the value or expose it through a public/client-prefixed variable. In this app the Wix CLI can manage environment values (`wix env set --key SENTRY_DSN --value <dsn>`); use the equivalent secret manager for another host. The DSN is not included in this document.

If `SENTRY_DSN` is missing, initialization is skipped and one configuration warning is logged. `captureError()` returns `captured: false` and the generated request ID remains available to the caller.

## Initialization options

The shared module initializes Sentry on the first capture and caches the initialized state. Its main options are:

```ts
Sentry.init({
  dsn: SENTRY_DSN,
  environment: import.meta.env.DEV ? 'development' : 'production',
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  integrations: (integrations) =>
    integrations.filter((integration) => integration.name !== 'Dedupe'),
  transport: (options) =>
    Sentry.makeFetchTransport(options, sentryTransportFetch),
  beforeBreadcrumb: sanitizeBreadcrumb,
  beforeSend(event) {
    // Filter sensitive request headers and remove body/cookie data.
    // See the implementation for the exact project-specific header list.
    return event;
  },
});
```

The actual `beforeSend` filters values for `authorization`, `cookie`, `set-cookie`, `x-api-key`, and `x-wix-access-token`, and removes request body and cookie fields. `sendDefaultPii: false` disables Sentry's default personally identifiable information collection. The default Dedupe integration is removed because this server-side use case should report repeated identical failures rather than silently suppress them. Tracing is sampled at 10%; this setup does not separately configure browser session replay.

The custom fetch transport logs and rethrows network failures to Sentry's ingest endpoint. Wix OAuth fetch breadcrumbs are rewritten to generic operation labels so OAuth endpoint paths are not retained.

## Capturing errors from routes

The reusable helper accepts an unknown error plus optional request context. In this app it is re-exported from `src/pages/api/reportError.ts` so API handlers can import it consistently.

```ts
import { captureError } from './reportError';

try {
  // route work
} catch (error) {
  const { requestId, eventId, captured } = await captureError(error, {
    requestId: locals.myTicketsRequestId,
    request,
  });

  // Return a generic client error and include requestId for support correlation.
}
```

When a caller does not supply a request ID, the helper generates one. It extracts a Wix request ID from supported error shapes or the `x-wix-request-id` response header, and attaches both IDs as searchable Sentry tags/context. When a `Request` is provided, it adds the HTTP method and URL path, but not query parameters. The helper returns `{ requestId, eventId, captured }` so the API response/logging can correlate with the Sentry event.

## Global request middleware and delivery

The Astro middleware creates or accepts `x-mytickets-request-id`, stores the value in `context.locals`, and sets it on the response. For an uncaught exception it:

1. Calls `captureError(error, { requestId, request })`.
2. Flushes Sentry with a 2-second timeout so a serverless request can deliver the event before the process exits.
3. Logs if flush did not confirm delivery.
4. Returns a generic JSON 500 response with the request ID header.

After a normal handler response with status 400 or above, middleware flushes any pending events, but does not create a Sentry event just because the status is an error.

## Security note before reusing

The current implementation adds the incoming `x-my-tickets-auth` agent token to `event.request.headers` inside `captureError()`. That header is not in the `beforeSend` sensitive-header filter list, so this can send an authentication token to Sentry. Do not copy that behavior into another app. Prefer attaching a non-secret user/agent identifier, or remove the header entirely; if you must keep it, explicitly redact it in `beforeSend` before sending. Review any other custom event processors for secrets as well.

Also keep API responses generic: return a request ID for support correlation, not exception messages, stack traces, credentials, or request bodies.

## Minimal adaptation checklist

1. Install `@sentry/browser` (or the SDK that matches the destination runtime).
2. Store the project DSN as a server-side secret named `SENTRY_DSN`.
3. Initialize once per process/runtime and set the deployment environment name.
4. Disable default PII collection and redact sensitive headers, cookies, bodies, and credentials.
5. Add a shared `captureError(error, { requestId, request })` helper.
6. Add a request ID to error responses and tags so logs, clients, and Sentry issues can be correlated.
7. Capture errors in route-level catches and add a global uncaught-exception boundary.
8. Flush before returning from short-lived/serverless requests, with a bounded timeout appropriate to the host.
9. Decide deliberately whether repeated identical errors should be deduplicated; this app disables Sentry's Dedupe integration.
10. Verify the test event appears in the intended Sentry project and environment without sensitive values.

## Source files in this app

- `src/monitoring/sentry.ts` — initialization, sanitization, error capture, and flush.
- `src/middleware.ts` — request IDs, global exception handling, and response-time flush.
- `src/pages/api/reportError.ts` — API-facing re-export of `captureError`.
- `astro.config.mjs` — server-only `SENTRY_DSN` declaration.
- `package.json` — Sentry SDK dependency.

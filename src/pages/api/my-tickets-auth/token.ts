// Shared signing/verification for the app's own agent-identity token.
// Deliberately separate from Wix auth: this token only ever carries our own
// agentId/teamId/roleId/instanceId, signed with a secret only this app knows about.
import { MY_TICKETS_AUTH_SECRET } from 'astro:env/server';
import { appInstances } from '@wix/app-management';
import { auth } from '@wix/essentials';

const HEADER_NAME = 'x-my-tickets-auth';
const ACCESS_TOKEN_TTL_SECONDS = 4 * 60 * 60; // 4 hours
const REFRESH_GRACE_PERIOD_SECONDS = 24 * 60 * 60; // allow refreshing up to 1 day after expiry

interface MyTicketsIdentity {
    agentId: string;
    teamId: string;
    roleId: string;
}

interface MyTicketsAuthPayload extends MyTicketsIdentity {
    instanceId: string;
    iat: number;
    exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(value.length + (4 - (value.length % 4)) % 4, '=');
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// the algorithm is always hardcoded here — never read from the token itself
async function getSigningKey(): Promise<CryptoKey> {
    if (!MY_TICKETS_AUTH_SECRET) {
        throw new Error('MY_TICKETS_AUTH_SECRET is not configured');
    }
    return crypto.subtle.importKey(
        'raw',
        encoder.encode(MY_TICKETS_AUTH_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

export async function issueToken(identity: MyTicketsIdentity): Promise<{ token: string; expiresAt: number }> {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + ACCESS_TOKEN_TTL_SECONDS;
    const elevatedGetAppInstance = auth.elevate(appInstances.getAppInstance);
    const appInstance = await elevatedGetAppInstance();
    const instanceId = appInstance?.instance?.instanceId;
    if (!instanceId) {
        throw new Error('Wix app instance ID is unavailable');
    }

    const payload: MyTicketsAuthPayload = { ...identity, instanceId, iat, exp };

    const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
    const key = await getSigningKey();
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload));
    const encodedSignature = base64UrlEncode(new Uint8Array(signature));

    return { token: `${encodedPayload}.${encodedSignature}`, expiresAt: exp };
}

export async function verifyToken(token: string, options: { allowExpiredWithinSeconds?: number } = {}): Promise<MyTicketsAuthPayload> {
    const [encodedPayload, encodedSignature] = token.split('.');
    if (!encodedPayload || !encodedSignature) {
        throw new Error('Malformed token');
    }

    const key = await getSigningKey();
    const signatureValid = await crypto.subtle.verify(
        'HMAC',
        key,
        new Uint8Array(base64UrlDecode(encodedSignature)),
        encoder.encode(encodedPayload)
    );
    if (!signatureValid) {
        throw new Error('Invalid token signature');
    }

    const payload: MyTicketsAuthPayload = JSON.parse(decoder.decode(base64UrlDecode(encodedPayload)));
    const now = Math.floor(Date.now() / 1000);
    const grace = options.allowExpiredWithinSeconds ?? 0;
    if (!payload.exp || payload.exp + grace < now) {
        throw new Error('Token has expired');
    }

    return payload;
}

export { HEADER_NAME, ACCESS_TOKEN_TTL_SECONDS, REFRESH_GRACE_PERIOD_SECONDS };
export type { MyTicketsIdentity, MyTicketsAuthPayload };

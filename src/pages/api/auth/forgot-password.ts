import type { APIRoute } from 'astro';
import { captureError } from '../reportError';
import { items } from '@wix/data';
import { notificationsV3 } from "@wix/notifications";
import { auth } from "@wix/essentials";
import { RESET_SECRET } from 'astro:env/server';
import { CollectionIds, type Agent } from '@jrapps/my_tickets_common_types';
const RESET_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export const POST: APIRoute = async ({ request, locals }) => {
    let resetToken = '';
    try {
        const { email } = await request.json();
        if (!email) {
            throw new Error('Email is required');
        }
        const name = await getName(email);
        const accessCode = generateAccessCode();
        const hashedCode = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(accessCode));
        const codeHash = Array.from(new Uint8Array(hashedCode)).map(b => b.toString(16).padStart(2, '0')).join('');
        const expiry = Date.now() + RESET_EXPIRY_MS;
        const token = await createResetToken(email, codeHash, expiry);
        resetToken = token;

        // Always return the same response shape. Unknown emails receive an
        // unusable token and no email, preventing account-existence disclosure.
        if (name) {
            const options = {
                dynamicValues: {
                    UserName: { text: name },
                    AccessCode: { text: accessCode },
                },
            };
            const elevatedNotify = auth.elevate(notificationsV3.notify);
            const response = await elevatedNotify('69ec5c18-f4eb-4921-a64a-b3caea1ac00c', options);
            if (!response) throw new Error('Failed to send notification');
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'If an account exists for this email, a reset code has been sent.',
            token: resetToken,
        }), { status: 200 });

    } catch (error: any) {
        const { requestId } = await captureError(error, { requestId: locals.myTicketsRequestId, request });
        return new Response(JSON.stringify({
            success: true,
            message: 'If an account exists for this email, a reset code has been sent.',
            token: resetToken,
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "x-mytickets-request-id": requestId
            },
        });
    }
}

async function getName(email: string): Promise<string | null> {
    try {
        let allItems: Agent[] = [];
        let result = await items.query(CollectionIds.AGENTS).eq('email', email).limit(1).find();

        while (result.hasNext()) {
            allItems = allItems.concat(result.items as Agent[]);
            result = await result.next();
        }
        allItems = allItems.concat(result.items as Agent[]);

        if (allItems.length > 0) {
            return allItems[0].name;
        } else return null;
    } catch (error: any) {
        throw error;
    }
}

function generateAccessCode(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => chars[b % chars.length]).join('');
}

export async function createResetToken(email: string, codeHash: string, expiry: number): Promise<string> {
    try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw', encoder.encode(RESET_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const data = `${email}:${codeHash}:${expiry}`;
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
        const sig = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
        // Token format: base64(email):codeHash:expiry:hmac
        return btoa(email) + ':' + codeHash + ':' + expiry + ':' + sig;
    } catch (error: any) {
        throw error;
    }
}

interface UserWithTeam {
    _id?: string;
    email: string;
    team: { _id: string };
    [key: string]: any;
}

interface TeamItem {
    _id?: string;
    permissions: Record<string, boolean>;
}

async function verifiedLogin(email: string): Promise<{ user: { success: boolean; teamId: string; agentId: string; permissions: Record<string, boolean> } }> {
    try {
        let allItems: UserWithTeam[] = [];
        let results = await items.query(CollectionIds.AGENTS)
            .eq('email', email)
            .include('team')
            .find()

        allItems = allItems.concat(results.items as UserWithTeam[]);

        while (results.hasNext()) {
            results = await results.next();
            allItems = allItems.concat(results.items as UserWithTeam[]);
        }

        if (allItems && allItems.length > 0) {
            const teamId = allItems[0]?.team?._id;
            const agentId = allItems[0]._id;
            if (!teamId || !agentId) {
                throw new Error("Team or agent ID not found");
            }
            const item = await items.get(CollectionIds.TEAMS, teamId) as TeamItem;
            if (!item) {
                throw new Error("Team not found for the user");
            }
            return { user: { success: true, teamId, agentId, permissions: item.permissions } };
        }
        throw new Error("User not found");
    } catch (error: any) {
        throw error;
    }
}

export async function verifyResetToken(token: string, submittedCodeHash: string): Promise<{ valid: boolean; user?: { success: boolean; teamId: string; agentId: string; permissions: Record<string, boolean> } }> {
    try {
        const parts = token.split(':');
        if (parts.length !== 4) return { valid: false };
        const [emailB64, storedHash, expiryStr, sig] = parts;
        const email = atob(emailB64);
        const expiry = parseInt(expiryStr, 10);

        if (Date.now() > expiry) return { valid: false };
        if (submittedCodeHash !== storedHash) return { valid: false };

        // Verify HMAC to ensure token wasn't tampered with
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw', encoder.encode(RESET_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const data = `${email}:${storedHash}:${expiry}`;
        const expected = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
        const expectedHex = Array.from(new Uint8Array(expected)).map(b => b.toString(16).padStart(2, '0')).join('');

        if (sig !== expectedHex) return { valid: false };
        const userResult = await verifiedLogin(email);
        if (!userResult || !userResult.user) return { valid: false };
        return { valid: true, user: userResult.user };
    } catch (error) {
        const { requestId } = await captureError(error as Error);
        throw new Error(`Error verifying reset token. Request ID: ${requestId}`);
    }
}

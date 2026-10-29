import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

const state = vi.hoisted(() => ({
    agent: null as any,
    patches: [] as Array<{ id: string; fields: Record<string, unknown> }>,
    failHashPatch: false,
    inserted: null as any,
    reject: false,
    resetOk: true,
}));

vi.mock('astro:env/server', () => ({ BASE_44_MY_TICKETS_BACKEND_MANAGER: 'x' }));
vi.mock('../reportError', () => ({ captureError: async () => ({ requestId: 'r' }) }));
vi.mock('../my-tickets-auth/token', () => ({ issueToken: async () => ({ token: 't', expiresAt: 1 }) }));
vi.mock('../auth/legacy-hash-policy', () => ({ get REJECT_LEGACY_PASSWORD_HASHES() { return state.reject; } }));
vi.mock('../auth/forgot-password', () => ({ verifyResetChallenge: async () => (state.resetOk ? { valid: true, agentId: 'a1' } : { valid: false }) }));
vi.mock('../auth/checkPermission', () => ({ checkPermission: async () => true }));
vi.mock('../utils/plan-limits', () => ({ getPlanLimitStatus: async () => ({ reached: false }) }));
vi.mock('@jrapps/my_tickets_common_types', () => ({ CollectionIds: { AGENTS: 'agents', TEAMS: 'teams' } }));
vi.mock('@wix/essentials', () => ({ auth: { elevate: (fn: any) => fn } }));
vi.mock('@wix/data', () => {
    const query = () => {
        const q: any = { eq: () => q, include: () => q, limit: () => q, find: async () => ({ items: [state.agent] }) };
        return q;
    };
    const patch = (_c: string, id: string) => {
        const fields: Record<string, unknown> = {};
        const p: any = {
            setField: (k: string, v: unknown) => { fields[k] = v; return p; },
            incrementField: () => p,
            run: async () => {
                if (state.failHashPatch && 'userId' in fields) throw new Error('save failed');
                state.patches.push({ id, fields });
                return { ...state.agent, ...fields };
            },
        };
        return p;
    };
    return { items: { query, patch, get: async () => ({ _id: 'team1' }), insert: async (_c: string, v: any) => { state.inserted = { _id: 'new1', ...v }; return state.inserted; } } };
});

import { POST as login } from '../auth/loginv1';
import { POST as create } from '../agents/create';
import { POST as resetPassword } from '../auth/reset-password';

async function sha(salt: string, pw: string) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + pw));
    return `${salt}:${Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')}`;
}
const call = (h: any, body: unknown) => h({ request: new Request('http://x', { method: 'POST', body: JSON.stringify(body) }), locals: {} });
const hashPatch = () => state.patches.filter(p => 'userId' in p.fields);

beforeEach(async () => {
    state.patches = []; state.failHashPatch = false; state.reject = true; state.resetOk = true;
    state.agent = { _id: 'a1', email: 'a@mytickets.internal', name: 'A', userId: await sha('salt1', 'correct-pw'), team: { _id: 'team1' }, role: { _id: 'role1', permissions: [] } };
});

describe('legacy hash upgrade (switch off)', () => {
    beforeEach(() => { state.reject = false; });
    it('upgrades to bcrypt on legacy login, touching only the hash field', async () => {
        const res = await call(login, { email: 'a@mytickets.internal', userId: 'correct-pw' });
        expect(res.status).toBe(200);
        const ups = hashPatch();
        expect(ups).toHaveLength(1);
        expect(Object.keys(ups[0].fields)).toEqual(['userId']);
        expect(ups[0].id).toBe('a1');
        expect(String(ups[0].fields.userId).startsWith('$2')).toBe(true);
        expect(bcrypt.compareSync('correct-pw', String(ups[0].fields.userId))).toBe(true);
    });
    it('wrong password fails and saves no hash', async () => {
        const res = await call(login, { email: 'a@mytickets.internal', userId: 'nope' });
        expect(res.status).toBe(401);
        expect(hashPatch()).toHaveLength(0);
    });
    it('a failed save does not block a correct login', async () => {
        state.failHashPatch = true;
        const res = await call(login, { email: 'a@mytickets.internal', userId: 'correct-pw' });
        expect(res.status).toBe(200);
        expect((await res.json()).success).toBe(true);
    });
    it('bcrypt accounts are not rewritten', async () => {
        state.agent.userId = bcrypt.hashSync('correct-pw', 4);
        const res = await call(login, { email: 'a@mytickets.internal', userId: 'correct-pw' });
        expect(res.status).toBe(200);
        expect(hashPatch()).toHaveLength(0);
    });
});

describe('legacy reject switch', () => {
    it('off: legacy login works', async () => {
        state.reject = false;
        const res = await call(login, { email: 'a@mytickets.internal', userId: 'correct-pw' });
        expect(res.status).toBe(200);
    });
    it('the shipped switch value is on', async () => {
        const actual = await vi.importActual<typeof import('../auth/legacy-hash-policy')>('../auth/legacy-hash-policy');
        expect(actual.REJECT_LEGACY_PASSWORD_HASHES).toBe(true);
    });
    it('on: legacy login with the right password goes to the reset path and nothing is saved', async () => {
        const res = await call(login, { email: 'a@mytickets.internal', userId: 'correct-pw' });
        expect(res.status).toBe(400);
        expect(state.patches).toHaveLength(0);
        expect(hashPatch()).toHaveLength(0);
    });
    it('on: legacy login with a wrong password is also rejected and nothing is saved', async () => {
        const res = await call(login, { email: 'a@mytickets.internal', userId: 'nope' });
        expect(res.status).toBe(400);
        expect(state.patches).toHaveLength(0);
    });
    it('on: bcrypt accounts still sign in', async () => {
        state.agent.userId = bcrypt.hashSync('correct-pw', 4);
        const res = await call(login, { email: 'a@mytickets.internal', userId: 'correct-pw' });
        expect(res.status).toBe(200);
    });
});

describe('reset flow for a rejected account (switch on)', () => {
    it('reset-password saves a bcrypt hash without needing the legacy hash, then the account signs in', async () => {
        const rejected = await call(login, { email: 'a@mytickets.internal', userId: 'correct-pw' });
        expect(rejected.status).toBe(400);
        const res = await call(resetPassword, { challengeId: 'c1', code: '123456', newPassword: 'brand-new-pw' });
        expect(res.status).toBe(200);
        const saved = hashPatch();
        expect(saved).toHaveLength(1);
        const newHash = String(saved[0].fields.userId);
        expect(newHash.startsWith('$2')).toBe(true);
        expect(bcrypt.compareSync('brand-new-pw', newHash)).toBe(true);
        state.agent.userId = newHash;
        const ok = await call(login, { email: 'a@mytickets.internal', userId: 'brand-new-pw' });
        expect(ok.status).toBe(200);
    });
    it('reset-password with an invalid code saves nothing', async () => {
        state.resetOk = false;
        const res = await call(resetPassword, { challengeId: 'c1', code: 'bad', newPassword: 'brand-new-pw' });
        expect(res.status).toBe(400);
        expect(state.patches).toHaveLength(0);
    });
});

describe('agent create response', () => {
    it('returns no hash and only whitelisted fields', async () => {
        const res = await call(create, { email: 'b', name: 'B', userId: 'secret-pw', team: 't', role: 'r', phoneNumber: '1', profilePictureUrl: 'u' });
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.user.userId).toBeUndefined();
        expect(JSON.stringify(body)).not.toContain('$2');
        expect(Object.keys(body.user).sort()).toEqual(['_id', 'email', 'name', 'phoneNumber', 'profilePictureUrl', 'role', 'team']);
        expect(state.inserted.userId.startsWith('$2')).toBe(true);
    });
});

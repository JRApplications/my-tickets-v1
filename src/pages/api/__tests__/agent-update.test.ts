import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

const state = vi.hoisted(() => ({
    stored: null as any,
    patches: [] as Array<{ id: string; fields: Record<string, unknown> }>,
    updateCalls: 0,
    missing: false,
}));

vi.mock('../reportError', () => ({ captureError: async () => ({ requestId: 'r' }) }));
vi.mock('../auth/checkPermission', () => ({ checkPermission: async () => true }));
vi.mock('@jrapps/my_tickets_common_types', () => ({ CollectionIds: { AGENTS: 'agents' } }));
vi.mock('@wix/essentials', () => ({ auth: { elevate: (fn: any) => fn } }));
vi.mock('@wix/data', () => ({
    items: {
        update: async () => { state.updateCalls++; return {}; },
        patch: (_c: string, id: string) => {
            const fields: Record<string, unknown> = {};
            const p: any = {
                setField: (k: string, v: unknown) => { fields[k] = v; return p; },
                run: async () => {
                    if (state.missing) return undefined;
                    state.patches.push({ id, fields });
                    state.stored = { ...state.stored, ...fields };
                    return state.stored;
                },
            };
            return p;
        },
    },
}));

import { PUT as update } from '../agents/update';

const call = (body: unknown) => update({ request: new Request('http://x/api/agents/update?id=a1', { method: 'PUT', body: JSON.stringify(body) }), locals: {} } as any);

beforeEach(() => {
    state.patches = []; state.updateCalls = 0; state.missing = false;
    state.stored = {
        _id: 'a1', userId: bcrypt.hashSync('old-pw', 4), name: 'Old', email: 'old@mytickets.internal',
        phoneNumber: '1', team: 't1', role: 'r1', profilePictureUrl: 'u',
        assignedTickets: ['x'], loginFailedAttempts: 2,
    };
});

describe('agent update', () => {
    it('edits only supplied profile fields and leaves the hash and other fields', async () => {
        const hash = state.stored.userId;
        const res = await call({ _id: 'a1', name: 'New', email: 'new', team: 't2', role: 'r2' });
        expect(res.status).toBe(200);
        expect(state.updateCalls).toBe(0);
        expect(state.patches).toHaveLength(1);
        expect(Object.keys(state.patches[0].fields).sort()).toEqual(['email', 'name', 'role', 'team']);
        expect(state.patches[0].fields.email).toBe('new@mytickets.internal');
        expect(state.stored.userId).toBe(hash);
        expect(state.stored.assignedTickets).toEqual(['x']);
        expect(state.stored.loginFailedAttempts).toBe(2);
    });
    it('empty password leaves the hash', async () => {
        const hash = state.stored.userId;
        const res = await call({ _id: 'a1', name: 'New', userId: '' });
        expect(res.status).toBe(200);
        expect('userId' in state.patches[0].fields).toBe(false);
        expect(state.stored.userId).toBe(hash);
    });
    it('new password stores a new bcrypt hash and the old one stops working', async () => {
        const res = await call({ _id: 'a1', name: 'New', userId: 'new-pw' });
        expect(res.status).toBe(200);
        const h = String(state.stored.userId);
        expect(h.startsWith('$2')).toBe(true);
        expect(bcrypt.compareSync('new-pw', h)).toBe(true);
        expect(bcrypt.compareSync('old-pw', h)).toBe(false);
    });
    it('response has no hash and only whitelisted fields', async () => {
        const res = await call({ _id: 'a1', name: 'New', userId: 'new-pw' });
        const text = await res.clone().text();
        expect(text).not.toContain('$2');
        const body = await res.json();
        expect(body.user.userId).toBeUndefined();
        expect(Object.keys(body.user).sort()).toEqual(['_id', 'email', 'name', 'phoneNumber', 'profilePictureUrl', 'role', 'team']);
    });
    it('can clear phone and picture with empty strings', async () => {
        await call({ _id: 'a1', phoneNumber: '', profilePictureUrl: '' });
        expect(state.patches[0].fields).toEqual({ phoneNumber: '', profilePictureUrl: '' });
    });
    it('invalid input fails and saves nothing', async () => {
        expect((await call({ name: 'x' })).status).toBe(400);
        expect((await call({ _id: 'a1' })).status).toBe(400);
        expect((await update({ request: new Request('http://x/api/agents/update', { method: 'PUT', body: '{}' }), locals: {} } as any)).status).toBe(400);
        expect(state.patches).toHaveLength(0);
    });
    it('unknown agent returns 404', async () => {
        state.missing = true;
        expect((await call({ _id: 'zz', name: 'x' })).status).toBe(404);
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
    instance: { isFree: true, billing: undefined } as any,
    count: 0,
    filters: [] as any[],
    queried: [] as string[],
}));

vi.mock('astro:env/server', () => ({ BASE_44_MY_TICKETS_BACKEND_MANAGER: 'x' }));
vi.mock('../reportError', () => ({ captureError: async () => ({ requestId: 'r' }) }));
vi.mock('../auth/system-admin', () => ({ isSystemAdmin: (id?: string) => id === 'system_admin' }));
vi.mock('../auth/checkPermission', () => ({ checkPermission: async () => true }));
vi.mock('../chat/conversation-auth', () => ({ insertConversation: vi.fn(async () => ({})) }));
vi.mock('@jrapps/my_tickets_common_types', () => ({ CollectionIds: { AGENTS: 'agents', TEAMS: 'teams', TICKETS: 'tickets', CHAT_CONVERSATIONS: 'chats' } }));
vi.mock('@wix/app-management', () => ({ appInstances: { getAppInstance: async () => ({ instance: state.instance }) } }));
vi.mock('@wix/members', () => ({ members: {} }));
vi.mock('@wix/essentials', () => ({ auth: { elevate: (fn: any) => fn, getTokenInfo: async () => ({ subjectId: 'visitor-123456', subjectType: 'VISITOR' }) } }));
vi.mock('@wix/data', () => ({
    items: {
        query: (collection: string) => {
            state.queried.push(collection);
            const q: any = { ge: (f: string, v: Date) => { state.filters.push({ f, v }); return q; }, count: async () => state.count };
            return q;
        },
    },
}));

import { getPlanLimitStatus } from '../utils/plan-limits';
import { resolvePlanTier, getPlanLimit, getCalendarMonth, FREE_PLAN_LIMITS } from '../utils/plan-config';
import { POST as createConversation } from '../chat/createConversation';

beforeEach(() => {
    state.instance = { isFree: true, billing: undefined };
    state.count = 0; state.filters = []; state.queried = [];
});

describe('plan tier', () => {
    it('free only when no paid package name is present', () => {
        expect(resolvePlanTier(undefined, true)).toBe('free');
        expect(resolvePlanTier('', true)).toBe('free');
        expect(resolvePlanTier('Essential', false)).toBe('essential');
        expect(resolvePlanTier('Team', false)).toBe('team');
        expect(resolvePlanTier('Advanced', false)).toBe('advanced');
        expect(resolvePlanTier('Essential', true)).toBe('essential');
        expect(resolvePlanTier(undefined, false)).toBe('unknown');
    });
    it('free limits are 1 of everything', () => {
        expect(FREE_PLAN_LIMITS).toEqual({ agents: 1, teams: 1, tickets: 1, chatConversations: 1 });
        expect(getPlanLimit('free', 'tickets')).toBe(1);
        expect(getPlanLimit('unknown', 'tickets')).toBeUndefined();
    });
    it('calendar month bounds are UTC', () => {
        const m = getCalendarMonth(new Date('2026-12-31T23:59:59Z'));
        expect(m.start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
        expect(m.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    });
});

describe('getPlanLimitStatus', () => {
    it('free: blocks agents and teams at 1 and does not filter by date', async () => {
        state.count = 1;
        expect((await getPlanLimitStatus('agents')).reached).toBe(true);
        expect((await getPlanLimitStatus('teams')).reached).toBe(true);
        expect(state.filters).toHaveLength(0);
        state.count = 0;
        expect((await getPlanLimitStatus('agents')).reached).toBe(false);
    });
    it('free: counts tickets and chats from the start of the calendar month', async () => {
        state.count = 1;
        const t = await getPlanLimitStatus('tickets');
        const c = await getPlanLimitStatus('chatConversations');
        expect(t).toMatchObject({ reached: true, limit: 1, isFreePlan: true });
        expect(c.reached).toBe(true);
        const start = getCalendarMonth(new Date()).start.toISOString();
        expect(state.filters.map((x) => x.v.toISOString())).toEqual([start, start]);
        expect(state.queried).toEqual(['tickets', 'chats']);
    });
    it('system admin is never limited', async () => {
        state.count = 99;
        expect((await getPlanLimitStatus('agents', 'system_admin')).reached).toBe(false);
    });
    it('paid advanced is unlimited and does not query', async () => {
        state.instance = { isFree: false, billing: { packageName: 'Advanced' } };
        state.count = 999;
        expect((await getPlanLimitStatus('agents')).reached).toBe(false);
        expect(state.queried).toHaveLength(0);
    });
    it('paid essential keeps its old limits and ignores chat limits', async () => {
        state.instance = { isFree: false, billing: { packageName: 'Essential', timeStamp: '2026-01-01T00:00:00Z' } };
        state.count = 1;
        expect((await getPlanLimitStatus('agents')).reached).toBe(true);
        state.count = 49;
        expect((await getPlanLimitStatus('tickets')).reached).toBe(false);
        state.count = 500;
        const chat = await getPlanLimitStatus('chatConversations');
        expect(chat.reached).toBe(false);
        expect(chat.limit).toBeUndefined();
    });
    it('unrecognised paid package is not limited (unchanged behaviour)', async () => {
        state.instance = { isFree: false, billing: { packageName: 'Mystery' } };
        state.count = 500;
        expect((await getPlanLimitStatus('agents')).reached).toBe(false);
    });
});

describe('chat createConversation', () => {
    const call = () => createConversation({ request: new Request('http://x/api/chat/createConversation', { method: 'POST' }), locals: {} } as any);
    it('free plan at the monthly limit returns a visitor-safe 409 with no pricing words', async () => {
        state.count = 1;
        const res = await call();
        const body = await res.json();
        expect(res.status).toBe(409);
        expect(body.limitReached).toBe(true);
        expect(body.error).not.toMatch(/upgrade|plan|price|pricing/i);
    });
    it('free plan under the limit creates the conversation', async () => {
        state.count = 0;
        const res = await call();
        expect(res.status).toBe(200);
        expect((await res.json()).success).toBe(true);
    });
    it('paid site is unaffected even with many conversations', async () => {
        state.instance = { isFree: false, billing: { packageName: 'Team', timeStamp: '2026-01-01T00:00:00Z' } };
        state.count = 9999;
        expect((await call()).status).toBe(200);
    });
});

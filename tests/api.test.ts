import { describe, expect, it } from 'vitest';
import { Client, entryClient, setupOwner, testEnv } from './helpers';

describe('الإعداد والدخول', () => {
  it('الإعداد يعمل مرة واحدة فقط', async () => {
    const owner = await setupOwner();
    const again = await new Client(owner.env).post('/auth/setup', { token: owner.env.SETUP_TOKEN, ownerName: 'x y', username: 'other', branchName: 'ab' });
    expect(again.status).toBe(409);
  });
  it('رمز إعداد خاطئ', async () => {
    const c = new Client(testEnv());
    expect((await c.post('/auth/setup', { token: 'wrong-token-1234567', ownerName: 'ab', username: 'abc', branchName: 'ab' })).status).toBe(401);
  });
  it('بدون جلسة = 401', async () => {
    expect((await new Client(testEnv()).get('/state')).status).toBe(401);
  });
  it('فحص Origin', async () => {
    const owner = await setupOwner();
    const res = await (owner as unknown as { app: { request: (...a: unknown[]) => Promise<Response> } }).app
      .request('/api/days', { method: 'POST', headers: { Origin: 'https://evil.test', Cookie: owner.cookie, 'Content-Type': 'application/json' }, body: '{"date":"2026-10-01","buy":425,"sell":null}' }, owner.env);
    expect(res.status).toBe(403);
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });
  it('قفل بعد 5 محاولات فاشلة', async () => {
    const owner = await setupOwner();
    await entryClient(owner);
    const c = new Client(owner.env);
    for (let i = 0; i < 5; i++) await c.post('/auth/login/password', { username: 'entry1', password: 'wrong' });
    expect((await c.post('/auth/login/password', { username: 'entry1', password: 'password-123456' })).status).toBe(423);
  });
  it('مدخل البيانات بدون «الإدارة»', async () => {
    const entry = await entryClient(await setupOwner());
    expect((await entry.get('/admin/users')).status).toBe(403);
    expect((await entry.get('/admin/log')).status).toBe(403);
  });
  it('رموز الاسترجاع: 10، وكل رمز مرة واحدة', async () => {
    const owner = await setupOwner();
    const codes = (await owner.post('/auth/recovery-codes')).json.codes as string[];
    expect(codes).toHaveLength(10);
    const c = new Client(owner.env);
    expect((await c.post('/auth/login/recovery', { username: 'owner', code: codes[0] })).status).toBe(200);
    expect((await new Client(owner.env).post('/auth/login/recovery', { username: 'owner', code: codes[0] })).status).toBe(401);
  });
  it('الإيقاف يُنهي جلسات المستخدم', async () => {
    const owner = await setupOwner();
    const entry = await entryClient(owner);
    const u = ((await owner.get('/admin/users')).json.users as { id: string; version: number; role: string }[]).find((x) => x.role === 'entry');
    expect((await owner.post(`/admin/users/${u?.id}/status`, { status: 'suspended', version: u?.version })).status).toBe(200);
    expect((await entry.get('/auth/me')).status).toBe(401);
  });
});

describe('رمز الإعداد غير مضبوط', () => {
  it('يرجع 503 بدل 401', async () => {
    const env = { ...testEnv(), SETUP_TOKEN: undefined };
    const r = await new Client(env).post('/auth/setup', { token: 'whatever-token-123456', ownerName: 'ab', username: 'abc', branchName: 'ab' });
    expect(r.status).toBe(503);
  });
});

describe('رمز إعداد من قاعدة البيانات', () => {
  it('يقبل الرمز مرة واحدة فقط', async () => {
    const { createDb } = await import('../worker/db/client');
    const { sha256 } = await import('../worker/lib/crypto');
    const { sql } = await import('drizzle-orm');
    const env = { ...testEnv(), SETUP_TOKEN: undefined };
    const db = createDb(env.DB);
    await db.run(sql`INSERT INTO setup_codes (code_hash, expires_at) VALUES (${await sha256('ONE-TIME-CODE-1234')}, ${Date.now() + 60000})`);
    const body = { token: 'ONE-TIME-CODE-1234', ownerName: 'يوسف', username: 'yousef12', branchName: 'الشارقة' };
    expect((await new Client(env).post('/auth/setup', { ...body, token: 'wrong-code-12345678' })).status).toBe(401);
    expect((await new Client(env).post('/auth/setup', body)).status).toBe(200);
    expect((await new Client(env).post('/auth/setup', body)).status).toBe(409);
  });
});

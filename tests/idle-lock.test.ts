import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDb } from '../worker/db/client';
import { entryClient, setupOwner, type Client } from './helpers';

/** يرجّع آخر نشاط لكل الجلسات للماضي (كأن الجهاز تُرك). */
async function idle(c: Client, minutes: number): Promise<void> {
  await createDb(c.env.DB).run(sql`UPDATE sessions SET last_active = ${Date.now() - minutes * 60_000}`);
}

describe('قفل عدم الاستخدام', () => {
  it('صاحب المحل: بعد 5 دقائق الخادم يرفض البيانات (423) والجلسة تبقى', async () => {
    const o = await setupOwner();
    await idle(o, 4);
    expect((await o.get('/state')).status).toBe(200);
    await idle(o, 6);
    const r = await o.get('/state');
    expect([r.status, r.json.error]).toEqual([423, 'session_locked']);
    expect((await o.post('/auth/ping')).status).toBe(423);
    expect((await o.get('/auth/me')).status).toBe(200);
  });
  it('مدخل البيانات: 15 دقيقة، ويفتح بكلمة المرور', async () => {
    const e = await entryClient(await setupOwner());
    await idle(e, 10);
    expect((await e.get('/state')).status).toBe(200);
    await idle(e, 16);
    expect((await e.get('/state')).status).toBe(423);
    expect((await e.post('/auth/unlock/password', { password: 'wrong' })).status).toBe(401);
    expect((await e.post('/auth/unlock/password', { password: 'password-123456' })).status).toBe(200);
    expect((await e.get('/state')).status).toBe(200);
  });
  it('5 محاولات فتح خاطئة تنهي الجلسة', async () => {
    const e = await entryClient(await setupOwner());
    await idle(e, 16);
    for (let i = 0; i < 4; i++) await e.post('/auth/unlock/password', { password: 'wrong' });
    expect((await e.post('/auth/unlock/password', { password: 'wrong' })).status).toBe(423);
    expect((await e.get('/auth/me')).status).toBe(401);
  });
  it('مدة الدخول: صاحب المحل 30 يوم، ومدخل البيانات 12 ساعة', async () => {
    const o = await setupOwner();
    await entryClient(o);
    const rows = await createDb(o.env.DB).all<{ role: string; d: number }>(sql`SELECT u.role, s.expires_at - s.created_at AS d FROM sessions s JOIN users u ON u.id = s.user_id`);
    const byRole = Object.fromEntries(rows.map((r) => [r.role, r.d]));
    expect(byRole).toEqual({ owner: 30 * 24 * 3_600_000, entry: 12 * 3_600_000 });
  });
});

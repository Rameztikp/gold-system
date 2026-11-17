import { describe, expect, it } from 'vitest';
import { Client, entryClient, otherBranchClient, saleLine, setupOwner, testEnv } from './helpers';
import { uuidv7 } from '../shared/domain';

async function dayFor(c: Client, date = '2026-10-01'): Promise<string> {
  const r = await c.post('/days', { date });
  return r.json.id as string;
}

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
    expect((await new Client(testEnv()).get('/days?from=2026-10-01&to=2026-10-31')).status).toBe(401);
  });
  it('فحص Origin', async () => {
    const owner = await setupOwner();
    const res = await (owner as unknown as { app: { request: (...a: unknown[]) => Promise<Response> } }).app
      .request('/api/days', { method: 'POST', headers: { Origin: 'https://evil.test', Cookie: owner.cookie, 'Content-Type': 'application/json' }, body: '{"date":"2026-10-01"}' }, owner.env);
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
    expect((await entry.get('/admin/audit')).status).toBe(403);
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

describe('الأيام والسطور', () => {
  it('حفظ السطر بنفس المعرّف لا يتكرر', async () => {
    const owner = await setupOwner();
    const dayId = await dayFor(owner);
    const line = saleLine(dayId);
    await owner.post('/lines', line);
    await owner.post('/lines', line);
    const view = await owner.get(`/days/${dayId}`);
    expect(view.json.lines).toHaveLength(1);
  });
  it('المجاميع والسطر الملغى', async () => {
    const owner = await setupOwner();
    const dayId = await dayFor(owner);
    await owner.post('/lines', saleLine(dayId));
    const second = (await owner.post('/lines', saleLine(dayId))).json;
    await owner.post(`/lines/${second.id}/cancel`, { reason: 'خطأ إدخال', version: second.version });
    const t = (await owner.get(`/days/${dayId}`)).json.totals;
    expect([t.salesFils, t.salesCount, t.wagesFils]).toEqual([150000, 1, 6500]);
  });
  it('تعارض الحفظ يرجع 409', async () => {
    const owner = await setupOwner();
    const dayId = await dayFor(owner);
    const l = (await owner.post('/lines', saleLine(dayId))).json;
    const values = { ...saleLine(dayId), version: l.version };
    delete (values as Record<string, unknown>).id; delete (values as Record<string, unknown>).dayId;
    expect((await owner.patch(`/lines/${l.id}`, { ...values, amountFils: 1 })).status).toBe(200);
    expect((await owner.patch(`/lines/${l.id}`, { ...values, amountFils: 2 })).status).toBe(409);
  });
  it('المقارنة بالدفتر وإعادة الفتح', async () => {
    const owner = await setupOwner();
    const dayId = await dayFor(owner);
    await owner.post('/lines', saleLine(dayId));
    const ledger = { salesFils: 150000, salesCg: 625, purchasesFils: 0, purchasesCg: 0, expensesFils: 0, wagesFils: 6500 };
    let day = (await owner.get(`/days/${dayId}`)).json.day;
    const cmp = await owner.post(`/days/${dayId}/compare`, { ledger, confirmLedgerError: false, version: day.version });
    expect(cmp.json.day.status).toBe('matched');
    await owner.post('/lines', { ...saleLine(dayId), kind: 'expense', description: 'غداء', amountFils: 2000 });
    day = (await owner.get(`/days/${dayId}`)).json.day;
    expect(day.status).toBe('matched');
    await owner.post('/lines', saleLine(dayId, { amountFils: 100 }));
    expect((await owner.get(`/days/${dayId}`)).json.day.status).toBe('not_compared');
  });
  it('تعديل الأسعار لا يعيد فتح اليوم', async () => {
    const owner = await setupOwner();
    const dayId = await dayFor(owner);
    const zero = { salesFils: 0, salesCg: 0, purchasesFils: 0, purchasesCg: 0, expensesFils: 0, wagesFils: 0 };
    const d = (await owner.post(`/days/${dayId}/compare`, { ledger: zero, confirmLedgerError: false, version: 1 })).json.day;
    const r = await owner.patch(`/days/${dayId}`, { goldPriceFils: 24000, note: '', version: d.version });
    expect(r.json.day.status).toBe('matched');
  });
  it('كل تعديل في سجل التعديلات', async () => {
    const owner = await setupOwner();
    const dayId = await dayFor(owner);
    const l = (await owner.post('/lines', saleLine(dayId))).json;
    await owner.post(`/lines/${l.id}/cancel`, { reason: 'خطأ', version: 1 });
    await owner.post(`/lines/${l.id}/cancel`, { reason: 'خطأ', version: 1 });
    const actions = ((await owner.get('/admin/audit')).json.entries as { action: string }[]).map((e) => e.action);
    expect(actions).toEqual(['cancel', 'create', 'create']);
  });
});

describe('حارس الفرع', () => {
  it('فرع آخر لا يرى ولا يعدّل', async () => {
    const owner = await setupOwner();
    const dayId = await dayFor(owner);
    const l = (await owner.post('/lines', saleLine(dayId))).json;
    const other = await otherBranchClient(owner.env);
    expect((await other.get(`/days/${dayId}`)).status).toBe(404);
    expect((await other.post(`/lines/${l.id}/cancel`, { reason: 'xx', version: 1 })).status).toBe(404);
    expect((await other.post('/lines', saleLine(dayId))).status).toBe(404);
    expect((await other.post('/lines', { ...saleLine(dayId), id: l.id })).status).toBe(409);
    expect((await other.get('/search?q=خاتم')).json.results).toHaveLength(0);
  });
});

describe('التقارير والبحث', () => {
  it('اللوحة الشهرية', async () => {
    const owner = await setupOwner();
    const d1 = await dayFor(owner, '2026-10-01');
    const d2 = await dayFor(owner, '2026-10-02');
    await owner.post('/lines', saleLine(d1));
    await owner.post('/lines', saleLine(d2, { kind: 'purchase', amountFils: 90000, weightCg: 400 }));
    const r = (await owner.get('/dashboard?period=month&date=2026-10-15')).json;
    expect(r.series).toHaveLength(31);
    expect([r.totals.salesFils, r.totals.purchasesFils, r.totals.purchasesCg]).toEqual([150000, 90000, 400]);
    expect(r.attention).toHaveLength(2);
  });
  it('البحث بالتطبيع ومن بداية الكلمة', async () => {
    const owner = await setupOwner();
    const dayId = await dayFor(owner);
    await owner.post('/lines', saleLine(dayId, { description: 'إسوارة ذهب عيار 21' }));
    expect((await owner.get(`/search?q=${encodeURIComponent('اسواره')}`)).json.results).toHaveLength(1);
    expect((await owner.get(`/search?q=${encodeURIComponent('سواره')}`)).json.results).toHaveLength(0);
  });
  it('اقتراحات البيان', async () => {
    const owner = await setupOwner();
    const dayId = await dayFor(owner);
    await owner.post('/lines', saleLine(dayId, { description: 'خاتم' }));
    expect((await owner.get(`/suggest?kind=sale&q=${encodeURIComponent('خا')}`)).json.suggestions).toEqual(['خاتم']);
  });
});

describe('الصور والنسخ', () => {
  it('ترفض الملف غير الصورة', async () => {
    const owner = await setupOwner();
    const dayId = await dayFor(owner);
    const app = (owner as unknown as { app: { request: (...a: unknown[]) => Promise<Response> } }).app;
    const send = (bytes: Uint8Array) => app.request(`/api/photos?id=${uuidv7()}&dayId=${dayId}`, { method: 'POST', headers: { Origin: 'https://gold.test', Cookie: owner.cookie }, body: bytes }, owner.env);
    expect((await send(new TextEncoder().encode('<script>'))).status).toBe(400);
    expect((await send(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]))).status).toBe(201);
  });
  it('النسخ الاحتياطي يحتاج الرمز', async () => {
    const c = new Client(testEnv());
    expect((await c.get('/backup')).status).toBe(401);
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

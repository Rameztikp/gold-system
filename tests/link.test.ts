import { describe, it, expect } from 'vitest';
import { Client, setupOwner, entryClient } from './helpers';

describe('رمز ربط جهاز جديد', () => {
  it('صاحب المحل يطلع رمز، والجهاز الجديد يدخل فيه مرة وحدة بس (يقبل الأرقام العربية)', async () => {
    const owner = await setupOwner();
    const r = await owner.post('/auth/link');
    expect(r.status).toBe(200);
    const code = r.json.code as string;
    expect(code).toMatch(/^\d{6}$/);
    const arabic = code.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!);
    const dev = new Client(owner.env);
    expect((await dev.post('/auth/login/link', { code: arabic })).status).toBe(200);
    expect((await dev.get('/auth/me')).json.role).toBe('owner');
    expect((await new Client(owner.env).post('/auth/login/link', { code })).status).toBe(401);
  });

  it('رمز جديد يلغي القديم', async () => {
    const owner = await setupOwner();
    const old = (await owner.post('/auth/link')).json.code as string;
    const neu = (await owner.post('/auth/link')).json.code as string;
    if (old !== neu) expect((await new Client(owner.env).post('/auth/login/link', { code: old })).status).toBe(401);
    expect((await new Client(owner.env).post('/auth/login/link', { code: neu })).status).toBe(200);
  });

  it('5 محاولات غلط تلغي الرمز حتى لو انكتب صح بعدها', async () => {
    const owner = await setupOwner();
    const code = (await owner.post('/auth/link')).json.code as string;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect((await new Client(owner.env).post('/auth/login/link', { code: wrong })).status).toBe(401);
    expect((await new Client(owner.env).post('/auth/login/link', { code })).status).toBe(401);
  });

  it('مدخل البيانات وغير الداخل ما يقدرون يطلعون رمز', async () => {
    const owner = await setupOwner();
    const entry = await entryClient(owner);
    expect((await entry.post('/auth/link')).status).toBe(403);
    expect((await new Client(owner.env).post('/auth/link')).status).toBe(401);
  });
});

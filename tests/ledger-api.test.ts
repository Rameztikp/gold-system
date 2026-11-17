import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { addLine, entryClient, exp, openDay, otherBranchClient, purch, sale, setupOwner, type Client } from './helpers';
import { T, sumTotals, uuidv7, type Day, type SeedDay } from '../shared/domain';

const dayOf = async (c: Client, date: string): Promise<Day> => (await c.get(`/days/${date}`)).json as unknown as Day;

describe('اليوم والسطور', () => {
  it('فتح يوم مرتين = تعارض', async () => {
    const o = await setupOwner();
    await openDay(o);
    expect((await o.post('/days', { date: '2026-10-01', buy: 425, sell: null })).status).toBe(409);
  });
  it('السطر بنفس المعرّف لا يتكرر', async () => {
    const o = await setupOwner();
    const date = await openDay(o);
    const id = uuidv7();
    await addLine(o, { date: date, sec: 'sales', id }, sale());
    const r = await addLine(o, { date: date, sec: 'sales', id }, sale());
    expect((r.json as unknown as Day).sales).toHaveLength(1);
  });
  it('الشراء بلا وزن مرفوض', async () => {
    const o = await setupOwner();
    const date = await openDay(o);
    expect((await addLine(o, { date: date, sec: 'purch' }, purch({ g: null, m: '' }))).status).toBe(400);
  });
  it('العيار من القائمة فقط', async () => {
    const o = await setupOwner();
    const date = await openDay(o);
    expect((await addLine(o, { date: date, sec: 'sales' }, sale({ k: '21 + 18' }))).status).toBe(201);
    expect((await addLine(o, { date: date, sec: 'sales' }, sale({ k: '19' }))).status).toBe(400);
  });
  it('الإلغاء يبقي السطر ولا يحسبه، والإرجاع يعيده', async () => {
    const o = await setupOwner();
    const date = await openDay(o);
    const d1 = (await addLine(o, { date: date, sec: 'sales' }, sale())).json as unknown as Day;
    const l = d1.sales[0];
    const d2 = (await o.post(`/lines/${l?.id}/cancel`, { r: 'سطر مكرر', v: l?.v })).json as unknown as Day;
    expect(d2.sales[0]?.x?.r).toBe('سطر مكرر');
    expect(T(d2).sales).toBe(0);
    const d3 = (await o.post(`/lines/${l?.id}/restore`, { v: d2.sales[0]?.v })).json as unknown as Day;
    expect(T(d3).sales).toBe(1500);
  });
  it('التعارض بين حفظين = 409', async () => {
    const o = await setupOwner();
    const date = await openDay(o);
    const l = ((await addLine(o, { date: date, sec: 'sales' }, sale())).json as unknown as Day).sales[0];
    expect((await o.put(`/lines/${l?.id}`, { line: sale({ p: 1600 }), v: l?.v })).status).toBe(200);
    expect((await o.put(`/lines/${l?.id}`, { line: sale({ p: 1700 }), v: l?.v })).status).toBe(409);
  });
});

describe('المقارنة بالدفتر', () => {
  async function matchedDay(o: Client): Promise<{ date: string; day: Day }> {
    const date = await openDay(o);
    await addLine(o, { date: date, sec: 'sales' }, sale());
    await o.put(`/days/${date}/daydata`, { comm: 30, xl: '', x: null, v: (await dayOf(o, date)).v });
    const v = (await dayOf(o, date)).v;
    const r = await o.post(`/days/${date}/compare`, { ledger: { sales: 1500, sw: 6.25, mk: 50, tot: 80 }, lerr: false, v });
    return { date, day: r.json as unknown as Day };
  }
  it('مطابق', async () => {
    const { day } = await matchedDay(await setupOwner());
    expect(day.status).toBe('ok');
  });
  it('الخادم يرفض «مطابق» إذا فيه فرق', async () => {
    const o = await setupOwner();
    const date = await openDay(o);
    await addLine(o, { date: date, sec: 'sales' }, sale());
    expect((await o.post(`/days/${date}/compare`, { ledger: { sales: 1600 }, lerr: false, v: 1 })).status).toBe(400);
    const r = await o.post(`/days/${date}/compare`, { ledger: { sales: 1600 }, lerr: true, v: 1 });
    expect((r.json as unknown as Day).note).toBe('مجموع المبيعات: 1,600.00 في الدفتر، و1,500.00 من السطور. السطور صحيحة، والخطأ في جمع الدفتر.');
  });
  it('إضافة بيع تعيد فتح اليوم، والمصروف لا', async () => {
    const o = await setupOwner();
    const { date } = await matchedDay(o);
    expect((await addLine(o, { date: date, sec: 'exp' }, exp())).json.status).toBe('ok');
    expect((await addLine(o, { date: date, sec: 'sales' }, sale({ p: 10 }))).json.status).toBe('open');
  });
  it('تعديل السعر لا يعيد الفتح، والعمولة تعيده', async () => {
    const o = await setupOwner();
    const { date, day } = await matchedDay(o);
    const p = (await o.put(`/days/${date}/prices`, { buy: 430, sell: 445, v: day.v })).json as unknown as Day;
    expect(p.status).toBe('ok');
    const c = (await o.put(`/days/${date}/daydata`, { comm: 40, xl: '', x: null, v: p.v })).json as unknown as Day;
    expect(c.status).toBe('open');
  });
});

describe('السجل والإدارة', () => {
  it('كل تعديل في السجل بعنوان النموذج', async () => {
    const o = await setupOwner();
    const date = await openDay(o);
    const l = ((await addLine(o, { date: date, sec: 'purch' }, purch())).json as unknown as Day).purch[0];
    await o.put(`/lines/${l?.id}`, { line: purch({ m: '25' }), v: l?.v });
    const titles = ((await o.get('/admin/log')).json.entries as { title: string; detail: string }[]);
    expect(titles.map((e) => e.title)).toEqual(['تعديل سطر الشراء 1، ليرة', 'إضافة سطر الشراء 1', 'فتح اليوم']);
    expect(titles[0]?.detail).toBe('الوزن: 7.20 ← 7.25 جم');
  });
  it('اسم الموظف الجديد يُضاف للقائمة', async () => {
    const o = await setupOwner();
    const date = await openDay(o);
    await addLine(o, { date: date, sec: 'exp' }, exp({ emp: 'علي', c: 'للموظفين' }));
    expect((await o.get('/state')).json.branch.names).toEqual(['علي']);
  });
  it('مدخل البيانات يُدخل ولا يغيّر الإعدادات', async () => {
    const o = await setupOwner();
    const e = await entryClient(o);
    expect((await e.post('/days', { date: '2026-10-02', buy: 425, sell: null })).status).toBe(201);
    expect((await e.put('/admin/settings/wa', { wa: '971501234567' })).status).toBe(403);
  });
});

describe('حارس الفرع', () => {
  it('فرع آخر لا يرى ولا يعدّل', async () => {
    const o = await setupOwner();
    const date = await openDay(o);
    const l = ((await addLine(o, { date: date, sec: 'sales' }, sale())).json as unknown as Day).sales[0];
    const other = await otherBranchClient(o.env);
    expect((await other.get(`/days/${date}`)).status).toBe(404);
    expect((await other.post(`/lines/${l?.id}/cancel`, { r: 'x', v: 1 })).status).toBe(404);
    expect((await other.get('/state')).json.days).toEqual([]);
  });
});

describe('بيانات أكتوبر عبر الخادم', () => {
  it('إدخال الأيام الثمانية كاملة يعطي أرقام التحقق بالضبط', async () => {
    const o = await setupOwner();
    const raw = JSON.parse(readFileSync(join(import.meta.dirname, '../prototype/data.json'), 'utf8')) as SeedDay[];
    for (const d of raw) {
      await openDay(o, d.id, d.gold);
      for (const l of d.sales) await addLine(o, { date: d.id, sec: 'sales' }, { d: l.d, g: l.g, m: l.m || '', k: l.k || '', mk: l.mk, p: l.p });
      for (const l of d.purch) await addLine(o, { date: d.id, sec: 'purch' }, { d: l.d, g: l.g, m: l.m || '', a: l.a, t: 'كسر' });
      for (const l of d.exp) await addLine(o, { date: d.id, sec: 'exp' }, { d: l.d, c: l.c, emp: '', a: l.a });
      for (const l of d.wd) await addLine(o, { date: d.id, sec: 'exp' }, { d: l.n === 'محمد' ? 'مصاريف محمد' : l.n, c: 'للموظفين', emp: l.n, a: l.a });
      await o.put(`/days/${d.id}/daydata`, { comm: d.comm, xl: d.xl || '', x: d.x, v: 1 });
    }
    const days = (await o.get('/state')).json.days as Day[];
    const t = sumTotals(days.map(T));
    expect({ sales: t.sales, sn: t.sn, sw: t.sw, purch: t.purch, pw: t.pw, exp: t.exp, en: t.en, tot: t.tot })
      .toEqual({ sales: 574615, sn: 112, sw: 1143.69, purch: 406270, pw: 971.83, exp: 20455, en: 25, tot: 21660 });
  }, 60_000);
});

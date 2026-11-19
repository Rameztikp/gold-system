import { describe, expect, it } from 'vitest';
import { addLine, entryClient, openDay, otherBranchClient, sale, setupOwner } from './helpers';
import type { Day } from '../shared/domain';

interface St { days: Day[]; now: number; full: boolean }

describe('التحديث الجزئي: الأيام اللي تغيّرت بس', () => {
  it('بدون since يرجّع كل الأيام، ومع since يرجّع اللي تغيّر بس', async () => {
    const o = await setupOwner();
    const d1 = await openDay(o, '2026-10-01');
    const d2 = await openDay(o, '2026-10-02');
    const full = (await o.get('/state')).json as unknown as St;
    expect(full.full).toBe(true);
    expect(full.days.map((d) => d.id).sort()).toEqual([d1, d2]);
    // مدخل البيانات يضيف سطر في يوم واحد
    const clerk = await entryClient(o);
    await addLine(clerk, { date: d2, sec: 'sales' }, sale());
    const part = (await o.get(`/state?since=${full.now}`)).json as unknown as St;
    expect(part.full).toBe(false);
    expect(part.days.find((d) => d.id === d2)?.sales).toHaveLength(1);
    // لو ما تغيّر شي بعد الوقت المرسل (مع التداخل)، ما يرجع أي يوم
    const later = (await o.get(`/state?since=${part.now + 10 * 60 * 1000}`)).json as unknown as St;
    expect(later.full).toBe(false);
    expect(later.days).toHaveLength(0);
  });

  it('ما يرجّع أيام فرع ثاني', async () => {
    const o = await setupOwner();
    const full = (await o.get('/state')).json as unknown as St;
    const other = await otherBranchClient(o.env);
    await openDay(other, '2026-10-05');
    const part = (await o.get(`/state?since=${full.now + 10 * 60 * 1000}`)).json as unknown as St;
    expect(part.days).toHaveLength(0);
    const near = (await o.get(`/state?since=${full.now}`)).json as unknown as St;
    expect(near.days.some((d) => d.id === '2026-10-05')).toBe(false);
  });

  it('since غلط = تحميل كامل', async () => {
    const o = await setupOwner();
    await openDay(o);
    const r = (await o.get('/state?since=abc')).json as unknown as St;
    expect(r.full).toBe(true);
    expect(r.days).toHaveLength(1);
  });
});

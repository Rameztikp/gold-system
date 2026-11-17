import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { T, sumTotals, compareLedger, dayFromSeed, type SeedDay } from './index';

/**
 * أرقام التحقق لأكتوبر 2026 — ثابتة ولا تُعدَّل (من الأمر الأصلي).
 * البيانات من النموذج المعتمد: prototype/data.json.
 */
const EXPECTED = {
  sales: 574615, sn: 112, sw: 1143.69,
  purch: 406270, pw: 971.83,
  exp: 20455, en: 25,
  tot: 21660,
};

const raw = JSON.parse(readFileSync(join(import.meta.dirname, '../../prototype/data.json'), 'utf8')) as SeedDay[];
let n = 0;
const days = raw.map((d) => dayFromSeed(d, () => `L${++n}`));

describe('أرقام التحقق — أكتوبر 2026', () => {
  it('المجاميع تطابق بالضبط', () => {
    const t = sumTotals(days.map(T));
    expect({ sales: t.sales, sn: t.sn, sw: t.sw, purch: t.purch, pw: t.pw, exp: t.exp, en: t.en, tot: t.tot }).toEqual(EXPECTED);
  });
  it('كل يوم «مطابق» في الدفتر يطابق فعلًا، واليوم 9 فيه الفرق المعروف', () => {
    for (const d of days) {
      const r = compareLedger(T(d), d.ledger);
      if (d.status === 'ok') expect(r.bad, d.id).toEqual([]);
      else expect(r.bad.length, d.id).toBeGreaterThan(0);
    }
  });
});

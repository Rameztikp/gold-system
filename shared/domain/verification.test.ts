import { describe, expect, it } from 'vitest';
import { computeTotals } from './totals';
import type { Line } from './line';

/**
 * أرقام التحقق لأكتوبر 2026 — ثابتة ولا تُعدَّل.
 * البيانات (data.json) غير متاحة بعد (Q-01). عند وصولها ضعها في tests/fixtures/october-2026.json
 * بصيغة مصفوفة Line وسيعمل الاختبار تلقائيًا.
 */
const EXPECTED = {
  salesFils: 57461500, salesPieces: 112, salesCg: 114369,
  purchasesFils: 40627000, purchasesCg: 97183,
  expensesFils: 2045500, expensesCount: 25,
  wagesFils: 2166000,
};

const fixtures = import.meta.glob<{ default: Line[] }>('../../tests/fixtures/october-2026.json', { eager: true });
const october = Object.values(fixtures)[0]?.default;

describe.skipIf(!october)('أرقام التحقق — أكتوبر 2026', () => {
  it('كل المجاميع تطابق بالضبط', () => {
    const t = computeTotals(october ?? []);
    expect({
      salesFils: t.salesFils, salesPieces: t.salesPieces, salesCg: t.salesCg,
      purchasesFils: t.purchasesFils, purchasesCg: t.purchasesCg,
      expensesFils: t.expensesFils, expensesCount: t.expensesCount, wagesFils: t.wagesFils,
    }).toEqual(EXPECTED);
  });
});

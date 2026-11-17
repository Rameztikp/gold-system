import { describe, expect, it } from 'vitest';
import { computeTotals } from './totals';
import { changeReopensDay, isSameAsPrevious, type Line } from './line';

const base: Line = {
  id: '1', kind: 'sale', description: 'خاتم', pieces: 1, weightCg: 625,
  amountFils: 150000, wagesFils: 5000, commissionFils: 1000, extraFils: 500, cancelled: false,
};

describe('المجاميع', () => {
  it('إجمالي الأجور = الأجور + العمولة + الإضافي', () => {
    expect(computeTotals([base]).wagesFils).toBe(6500);
  });
  it('السطر الملغى لا يدخل', () => {
    const t = computeTotals([base, { ...base, id: '2', cancelled: true }]);
    expect(t.salesFils).toBe(150000);
    expect(t.salesCount).toBe(1);
  });
  it('الأنواع منفصلة', () => {
    const t = computeTotals([
      base,
      { ...base, id: '2', kind: 'purchase', amountFils: 90000, weightCg: 400 },
      { ...base, id: '3', kind: 'expense', amountFils: 2000 },
    ]);
    expect([t.salesFils, t.purchasesFils, t.purchasesCg, t.expensesFils]).toEqual([150000, 90000, 400, 2000]);
  });
});

describe('السطر', () => {
  it('مطابق للسابق', () => expect(isSameAsPrevious(base, { ...base })).toBe(true));
  it('غير مطابق', () => expect(isSameAsPrevious(base, { ...base, pieces: 2 })).toBe(false));
  it('تعديل البيع يعيد فتح اليوم', () => expect(changeReopensDay(base, { ...base, amountFils: 1 })).toBe(true));
  it('تعديل العمولة يعيد فتح اليوم', () => expect(changeReopensDay(base, { ...base, commissionFils: 1 })).toBe(true));
  it('تعديل البيان فقط لا يعيده', () => expect(changeReopensDay(base, { ...base, description: 'x' })).toBe(false));
  it('المصروف لا يعيده', () => {
    const e: Line = { ...base, kind: 'expense' };
    expect(changeReopensDay(e, { ...e, amountFils: 9 })).toBe(false);
    expect(changeReopensDay(null, e)).toBe(false);
  });
  it('إضافة بيع جديد تعيده', () => expect(changeReopensDay(null, base)).toBe(true));
});

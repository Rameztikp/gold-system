import { describe, expect, it } from 'vitest';
import { compareWithLedger, statusAfterCompare, type Ledger } from './compare';
import { emptyTotals } from './totals';

const t = { ...emptyTotals(), salesFils: 100, salesCg: 50, purchasesFils: 30, purchasesCg: 10, expensesFils: 5, wagesFils: 7 };
const ledger: Ledger = { salesFils: 100, salesCg: 50, purchasesFils: 30, purchasesCg: 10, expensesFils: 5, wagesFils: 7 };

describe('المقارنة بالدفتر', () => {
  it('6 بنود', () => expect(compareWithLedger(t, ledger)).toHaveLength(6));
  it('مطابق', () => expect(statusAfterCompare(compareWithLedger(t, ledger), false)).toBe('matched'));
  it('فرق فلس واحد غير مطابق (0.01 ≥ 0.005)', () => {
    const items = compareWithLedger(t, { ...ledger, salesFils: 101 });
    expect(items[0]?.matched).toBe(false);
    expect(items[0]?.diff).toBe(-1);
  });
  it('خطأ في الدفتر بعد التأكيد', () => {
    expect(statusAfterCompare(compareWithLedger(t, { ...ledger, expensesFils: 6 }), true)).toBe('ledger_error');
  });
  it('بدون تأكيد يبقى لم يُقارن', () => {
    expect(statusAfterCompare(compareWithLedger(t, { ...ledger, expensesFils: 6 }), false)).toBe('not_compared');
  });
  it('بند فارغ غير مطابق', () => {
    expect(compareWithLedger(t, { ...ledger, wagesFils: null })[5]?.matched).toBe(false);
  });
});

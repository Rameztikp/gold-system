import type { Totals } from './totals';

export type CompareKey = 'salesFils' | 'salesCg' | 'purchasesFils' | 'purchasesCg' | 'expensesFils' | 'wagesFils';
export const COMPARE_KEYS: readonly CompareKey[] = [
  'salesFils', 'salesCg', 'purchasesFils', 'purchasesCg', 'expensesFils', 'wagesFils',
];

export type Ledger = Record<CompareKey, number | null>;
export type DayStatus = 'matched' | 'ledger_error' | 'not_compared';

export interface CompareItem {
  key: CompareKey;
  system: number;
  ledger: number | null;
  diff: number | null;
  matched: boolean;
}

/** القيم أعداد صحيحة بأصغر وحدة؛ «الفرق أقل من 0.005» يعني فرقًا يساوي صفرًا. */
const MATCH_TOLERANCE_UNITS = 0.5;

export function compareItem(key: CompareKey, system: number, ledger: number | null): CompareItem {
  if (ledger === null) return { key, system, ledger, diff: null, matched: false };
  const diff = system - ledger;
  return { key, system, ledger, diff, matched: Math.abs(diff) < MATCH_TOLERANCE_UNITS };
}

export function compareWithLedger(totals: Totals, ledger: Ledger): CompareItem[] {
  return COMPARE_KEYS.map((k) => compareItem(k, totals[k], ledger[k]));
}

export const allMatched = (items: readonly CompareItem[]): boolean => items.every((i) => i.matched);

export const isLedgerComplete = (ledger: Ledger): boolean => COMPARE_KEYS.every((k) => ledger[k] !== null);

/**
 * الحالة بعد الضغط على «قارن»:
 * - كل البنود مطابقة → matched
 * - فيه فرق وأكّد المستخدم أن الخطأ في جمع الدفتر → ledger_error
 * - غير ذلك → not_compared
 */
export function statusAfterCompare(items: readonly CompareItem[], confirmLedgerError: boolean): DayStatus {
  if (allMatched(items)) return 'matched';
  return confirmLedgerError ? 'ledger_error' : 'not_compared';
}

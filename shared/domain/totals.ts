import { type Line, lineWagesTotal } from './line';

export interface Totals {
  salesFils: number;
  salesCg: number;
  salesPieces: number;
  salesCount: number;
  purchasesFils: number;
  purchasesCg: number;
  purchasesCount: number;
  expensesFils: number;
  expensesCount: number;
  wagesFils: number;
}

export const emptyTotals = (): Totals => ({
  salesFils: 0, salesCg: 0, salesPieces: 0, salesCount: 0,
  purchasesFils: 0, purchasesCg: 0, purchasesCount: 0,
  expensesFils: 0, expensesCount: 0, wagesFils: 0,
});

function addLine(t: Totals, l: Line): void {
  if (l.kind === 'sale') {
    t.salesFils += l.amountFils;
    t.salesCg += l.weightCg;
    t.salesPieces += l.pieces;
    t.salesCount += 1;
    t.wagesFils += lineWagesTotal(l);
  } else if (l.kind === 'purchase') {
    t.purchasesFils += l.amountFils;
    t.purchasesCg += l.weightCg;
    t.purchasesCount += 1;
  } else {
    t.expensesFils += l.amountFils;
    t.expensesCount += 1;
  }
}

/** السطر الملغى لا يدخل أي مجموع. */
export function computeTotals(lines: readonly Line[]): Totals {
  const t = emptyTotals();
  for (const l of lines) if (!l.cancelled) addLine(t, l);
  return t;
}

export function sumTotals(list: readonly Totals[]): Totals {
  const t = emptyTotals();
  for (const x of list) {
    for (const k of Object.keys(t) as (keyof Totals)[]) t[k] += x[k];
  }
  return t;
}

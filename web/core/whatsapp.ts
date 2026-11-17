import { T } from '../texts';
import { formatAmount, formatWeight, type Totals, type DayStatus } from '../../shared/domain';

export function daySummaryText(input: { branch: string; date: string; totals: Totals; status: DayStatus }): string {
  const t = input.totals;
  const w = T.whatsapp;
  return [
    w.header(input.branch, input.date),
    `${w.sales}: ${formatAmount(t.salesFils)} (${t.salesPieces} قطعة، ${formatWeight(t.salesCg)} جم)`,
    `${w.purchases}: ${formatAmount(t.purchasesFils)} (${formatWeight(t.purchasesCg)} جم)`,
    `${w.expenses}: ${formatAmount(t.expensesFils)}`,
    `${w.wages}: ${formatAmount(t.wagesFils)}`,
    `${w.status}: ${T.status[input.status]}`,
  ].join('\n');
}

/** رسالة الواتساب عبر wa.me */
export const whatsappUrl = (text: string): string => `https://wa.me/?text=${encodeURIComponent(text)}`;

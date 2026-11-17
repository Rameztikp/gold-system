import { hasVal, r2, toFils, type CmpKey, type Day, type LedgerVals, type Totals } from './ledger';
import { g2, money } from './format';

/** بنود المقارنة الستة كما في النموذج (CMP_ROWS): [المفتاح، الاسم، مكانه في الدفتر]. */
export const CMP_ROWS: readonly (readonly [CmpKey, string, string])[] = [
  ['sales', 'مجموع المبيعات', 'أسفل صفحة المبيعات'],
  ['sw', 'وزن المبيعات', 'أسفل صفحة المبيعات'],
  ['mk', 'الأجور', 'أسفل صفحة المبيعات'],
  ['tot', 'إجمالي الأجور', 'أسفل صفحة المبيعات'],
  ['purch', 'المشتريات', 'تحت جدول الصندوق'],
  ['pw', 'وزن المشتريات', 'تحت جدول الصندوق'],
];
export const isW = (k: CmpKey): boolean => k === 'sw' || k === 'pw';

export interface CmpBad { k: CmpKey; label: string; ledger: number; sys: number }
export interface CmpResult { filled: number; bad: CmpBad[] }

/** البند مطابق إذا الفرق أقل من 0.005 — والقيم بخانتين، فالفرق لازم يكون صفرًا. الخانة الفارغة لا تُقارن. */
export function compareLedger(t: Totals, ledger: LedgerVals): CmpResult {
  let filled = 0;
  const bad: CmpBad[] = [];
  for (const [k, label] of CMP_ROWS) {
    const v = ledger[k];
    if (!hasVal(v) || Number.isNaN(Number(v))) continue;
    filled++;
    if (toFils(t[k]) !== toFils(v)) bad.push({ k, label, ledger: r2(v), sys: r2(t[k]) });
  }
  return { filled, bad };
}

/** نص الملاحظة عند الحفظ مع «خطأ في جمع الدفتر» (saveCompare في النموذج). */
export function lerrNote(bad: readonly CmpBad[]): string {
  const fmt = (k: CmpKey, v: number): string => (isW(k) ? g2(v) : money(v));
  return bad.map((b) => `${b.label}: ${fmt(b.k, b.ledger)} في الدفتر، و${fmt(b.k, b.sys)} من السطور`).join('. ')
    + '. السطور صحيحة، والخطأ في جمع الدفتر.';
}

/** يرجع اليوم إلى «لم يُقارن» (reopen في النموذج). */
export function reopen(day: Pick<Day, 'status' | 'note'>): void {
  if (day.status === 'ok' || day.status === 'lerr') {
    day.status = 'open';
    day.note = '';
  }
}

export type LineKind = 'sale' | 'purchase' | 'expense';

export interface LineValues {
  kind: LineKind;
  description: string;
  pieces: number;
  weightCg: number;
  amountFils: number;
  wagesFils: number;
  commissionFils: number;
  extraFils: number;
}

export interface Line extends LineValues {
  id: string;
  cancelled: boolean;
}

/** إجمالي الأجور = الأجور + العمولة + البند الإضافي */
export const lineWagesTotal = (l: LineValues): number => l.wagesFils + l.commissionFils + l.extraFils;

const SAME_FIELDS: (keyof LineValues)[] = [
  'kind', 'description', 'pieces', 'weightCg', 'amountFils', 'wagesFils', 'commissionFils', 'extraFils',
];

/** سطر مطابق للسطر الذي قبله: سؤال للمستخدم، لا منع. */
export function isSameAsPrevious(candidate: LineValues, previous: LineValues | undefined): boolean {
  if (!previous) return false;
  return SAME_FIELDS.every((f) => candidate[f] === previous[f]);
}

const REOPEN_FIELDS: (keyof LineValues)[] = ['pieces', 'weightCg', 'amountFils', 'commissionFils', 'wagesFils', 'extraFils'];

/** تعديل البيع أو الشراء أو العمولة يعيد فتح اليوم. المصروفات لا. */
export function changeReopensDay(before: Line | null, after: Line): boolean {
  if (after.kind === 'expense' && (before === null || before.kind === 'expense')) return false;
  if (before === null) return true;
  if (before.cancelled !== after.cancelled || before.kind !== after.kind) return true;
  return REOPEN_FIELDS.some((f) => before[f] !== after[f]);
}

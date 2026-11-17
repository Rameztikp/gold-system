/** تنسيق الأرقام كما في النموذج: خانتان دائمًا، وفواصل الآلاف. */
const r2 = (n: unknown): number => Math.round((Number(n) || 0) * 100) / 100;
export const money = (n: unknown): string => r2(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const g2 = money;
export const int = (n: unknown): string => Math.round(Number(n) || 0).toLocaleString('en-US');
const hasV = (v: unknown): boolean => v !== null && v !== undefined && v !== '';
/** السعر مبلغ أيضًا: خانتان دائمًا. */
export const pr = (n: unknown): string => (hasV(n) ? money(n) : '—');

/** التواريخ كنص YYYY-MM-DD (تاريخ تقويمي بدون منطقة زمنية). */

const pad = (n: number): string => String(n).padStart(2, '0');

export function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, day ?? 1));
}

export const formatDate = (d: Date): string =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function addDays(d: string, n: number): string {
  const x = parseDate(d);
  x.setUTCDate(x.getUTCDate() + n);
  return formatDate(x);
}

export interface Range { from: string; to: string }

/** weekStart: 0=الأحد … 6=السبت */
export function weekRange(d: string, weekStart: number): Range {
  const back = (parseDate(d).getUTCDay() - weekStart + 7) % 7;
  const from = addDays(d, -back);
  return { from, to: addDays(from, 6) };
}

export function monthRange(d: string): Range {
  const x = parseDate(d);
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0));
  return { from: `${d.slice(0, 7)}-01`, to: formatDate(last) };
}

export function datesInRange(r: Range): string[] {
  const out: string[] = [];
  for (let d = r.from; d <= r.to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** تاريخ اليوم في منطقة الفرع الزمنية. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export const isValidDate = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d) && formatDate(parseDate(d)) === d;

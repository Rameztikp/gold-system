/* أدوات صغيرة — منقولة من النموذج (prototype/app.js: small helpers). */
import { latin, normC, findWord, money, int } from '../../shared/domain';

export { money, int, pr, g2 } from '../../shared/domain';
export { hasVal, W, r2 } from '../../shared/domain';

export const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const KARATS = ['24', '22', '21', '18'];
export const C = { sales: 'var(--c-sales)', purch: 'var(--c-purch)', exp: 'var(--c-exp)', tot: 'var(--c-tot)' } as const;
export const PH_LABELS = { sales: 'صفحة المبيعات', cash: 'صفحة الخرج', other: 'صفحة أخرى' } as const;
export const NO_EMP = 'بدون';

export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document): T | null => r.querySelector<T>(s);
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document): T[] => [...r.querySelectorAll<T>(s)];
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
export const num = (s: unknown): string => `<span class="num">${s}</span>`;
export const big = (n: number): string => { const [a, b] = money(n).split('.'); return `<span class="num">${a}<span class="dec">.${b}</span></span>`; };
export const sum = <T>(a: readonly T[], f: (x: T) => unknown): number => a.reduce((t, x) => t + (Number(f(x)) || 0), 0);
export const strip = (s: string): string => String(s).replace(/<[^>]+>/g, '');
export { latin };

interface Plural { one: string; two: string; few: string; many: string }
export const plural = (n: number, w: Plural): string => (n === 1 ? w.one : n === 2 ? w.two : (n >= 3 && n <= 10 ? `${num(n)} ${w.few}` : `${num(int(n))} ${w.many}`));
export const linesW = (n: number): string => (n === 0 ? 'لا سطور' : plural(n, { one: 'سطر واحد', two: 'سطران', few: 'أسطر', many: 'سطرًا' }));
export const daysW = (n: number): string => plural(n, { one: 'يوم واحد', two: 'يومان', few: 'أيام', many: 'يومًا' });
export const piecesW = (n: number): string => plural(n, { one: 'قطعة واحدة', two: 'قطعتان', few: 'قطع', many: 'قطعة' });

/** يعلّم مكان كل كلمة بحث في النص (hlTerms). */
export function hlTerms(s: unknown, terms: readonly string[]): string {
  const arr = [...String(s ?? '')]; const map: number[] = []; let ns = '';
  arr.forEach((c, i) => { for (const ch of normC(c)) { ns += ch; map.push(i); } });
  const rs: [number, number][] = [];
  for (const t of terms) { const i = findWord(ns, t); if (i >= 0) rs.push([map[i]!, map[i + t.length - 1]! + 1]); }
  if (!rs.length) return esc(s);
  rs.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of rs) { const last = merged[merged.length - 1]; if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push([...r]); }
  let out = ''; let p = 0;
  for (const [a, b] of merged) { out += `${esc(arr.slice(p, a).join(''))}<mark>${esc(arr.slice(a, b).join(''))}</mark>`; p = b; }
  return out + esc(arr.slice(p).join(''));
}
export const hlText = (s: unknown, qn: string): string => hlTerms(s, qn ? [qn] : []);

/* ---------------------------------------------------------------- التواريخ */
export const D = (id: string): Date => { const [y, m, d] = id.split('-').map(Number); return new Date(Date.UTC(y!, m! - 1, d)); };
export const ID = (t: Date): string => t.toISOString().slice(0, 10);
export const add = (id: string, n: number): string => { const t = D(id); t.setUTCDate(t.getUTCDate() + n); return ID(t); };
export const dow = (id: string): number => D(id).getUTCDay();
export const dnum = (id: string): number => D(id).getUTCDate();
export const dayLong = (id: string): string => { const t = D(id); return `${DAYS_AR[t.getUTCDay()]} ${t.getUTCDate()} ${MONTHS_AR[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };
export const dayMid = (id: string): string => { const t = D(id); return `${DAYS_AR[t.getUTCDay()]} ${t.getUTCDate()} ${MONTHS_AR[t.getUTCMonth()]}`; };
export const dayShort = (id: string): string => { const t = D(id); return `${DAYS_AR[t.getUTCDay()]} ${t.getUTCDate()}/${t.getUTCMonth() + 1}`; };
export const monthLabel = (id: string): string => { const t = D(id); return `${MONTHS_AR[t.getUTCMonth()]} ${t.getUTCFullYear()}`; };
export const monthStart = (id: string): string => id.slice(0, 8) + '01';
export const monthEnd = (id: string): string => { const t = D(monthStart(id)); t.setUTCMonth(t.getUTCMonth() + 1); t.setUTCDate(0); return ID(t); };
export const spanDays = (f: string, t: string): number => Math.round((D(t).getTime() - D(f).getTime()) / 864e5) + 1;

export function spanLabel(f: string, t: string): string {
  if (f === t) return dayLong(f);
  const a = D(f); const b = D(t);
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) return `${a.getUTCDate()} – ${b.getUTCDate()} ${MONTHS_AR[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  return `${a.getUTCDate()} ${MONTHS_AR[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS_AR[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

export function stamp(ts: number): string {
  const t = new Date(ts);
  let h = t.getHours(); const ap = h < 12 ? 'ص' : 'م'; h = h % 12 || 12;
  return `${num(`${t.getDate()}/${t.getMonth() + 1}`)}، ${num(`${h}:${String(t.getMinutes()).padStart(2, '0')}`)} ${ap}`;
}

/** أيام متتالية تُكتب مدى: «7–13 أكتوبر». */
export function ranges(ids: readonly string[]): string {
  const out: [string, string][] = []; let s: string | null = null; let p: string | null = null;
  for (const id of ids) {
    if (s && p && add(p, 1) === id) { p = id; continue; }
    if (s && p) out.push([s, p]);
    s = p = id;
  }
  if (s && p) out.push([s, p]);
  return out.map(([a, b]) => (a === b ? `${num(dnum(a))} ${MONTHS_AR[D(a).getUTCMonth()]}` : `${num(`${dnum(a)}–${dnum(b)}`)} ${MONTHS_AR[D(b).getUTCMonth()]}`)).join('، ');
}

/** اليوم بتوقيت الفرع. */
export const todayIn = (tz: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

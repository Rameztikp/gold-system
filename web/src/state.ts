/* الحالة — S بيانات الفرع من الخادم، و U حالة الواجهة (كما في النموذج). */
import { T, live, r2, reopen, type AnyLine, type Day, type Sec, type Totals } from '../../shared/domain';
import { add, dayLong, dayShort, dow, monthEnd, monthLabel, monthStart, spanDays, spanLabel, todayIn } from './util';

export type Role = 'owner' | 'clerk';
export interface Me { id: string; branchId: string; name: string; role: 'owner' | 'entry' }
export interface Branch {
  name: string; currency: string; countryCode: string; timezone: string; weekStart: number;
  cats: string[]; names: string[]; wa: string; version: number;
}
export interface Period { kind: 'day' | 'week' | 'month' | 'range'; anchor: string; from?: string; to?: string }
export type Route = 'dash' | 'reports' | 'days' | 'entry' | 'search' | 'log' | 'users' | 'settings';
export type Step = 'sales' | 'purch' | 'exp' | 'check';
export interface Viewer { day: string; sel?: string | null; step?: Step | null }

export interface Store { days: Record<string, Day>; branch: Branch; me: Me }
export interface UiState {
  user: Role | null; route: Route; day: string | null; step: Step;
  period: Period | null; rperiod: Period | null; qperiod: Period | null;
  dtab: string; pv: Viewer | null; q: string; qs: string; rkind: string; logf: string;
  tview: boolean; dm: string | null; hl: string | null; flash: string | null; fromSearch: boolean;
}

export const S: Store = {
  days: {},
  branch: { name: '', currency: 'AED', countryCode: '971', timezone: 'Asia/Dubai', weekStart: 6, cats: [], names: [], wa: '', version: 1 },
  me: { id: '', branchId: '', name: '', role: 'entry' },
};

export const U: UiState = {
  user: null, route: 'dash', day: null, step: 'sales', period: null, rperiod: null, qperiod: null,
  dtab: 'sales', pv: null, q: '', qs: 'all', rkind: 'sum', logf: 'all', tview: false, dm: null, hl: null, flash: null, fromSearch: false,
};

export const ADMIN: readonly Route[] = ['log', 'users', 'settings'];
export const STEPS: readonly (readonly [Step, string])[] = [['sales', 'المبيعات'], ['purch', 'المشتريات'], ['exp', 'المصروفات'], ['check', 'المقارنة بالدفتر']];
export const ROLES: Record<Role, { name: string; role: string; init: string }> = {
  owner: { name: 'صاحب المحل', role: 'كل الصلاحيات', init: 'ص' },
  clerk: { name: 'مدخل البيانات', role: 'موظف الإدخال', init: 'م' },
};

/** اسم النظام (D-02) وسطر المحل من إعدادات الفرع. */
export const APP_NAME = 'نظام الذهب';
export const shopLine = (): string => `محل الذهب، ${S.branch.name}`;
const CURRENCY_WORD: Record<string, string> = { AED: 'درهم', QAR: 'ريال', SAR: 'ريال', OMR: 'ريال', KWD: 'دينار', BHD: 'دينار' };
export const currencyWord = (): string => CURRENCY_WORD[S.branch.currency] ?? S.branch.currency;
export const today = (): string => todayIn(S.branch.timezone);

export const dayIds = (): string[] => Object.keys(S.days).sort();
export const lastDay = (): string => dayIds().slice(-1)[0] ?? today();
/** سطور انضافت في الشاشة وما وصلت الخادم بعد (D-32). تبقى ظاهرة حتى لو وصل اليوم من الخادم بدونها. */
export interface PendingLine { id: string; day: string; sec: Sec; line: Record<string, unknown> }
export const PENDING = new Map<string, PendingLine>();
export const isPending = (id: string): boolean => PENDING.has(id);

/** يحط اليوم من الخادم، ويرجّع فوقه السطور اللي لسا بالانتظار. */
export const applyDay = (d: Day): void => {
  for (const p of PENDING.values()) {
    if (p.day !== d.id) continue;
    const arr = d[p.sec] as AnyLine[];
    if (!arr.some((l) => l.id === p.id)) { arr.push({ ...p.line, id: p.id, v: 0 } as unknown as AnyLine); reopen(d); }
  }
  S.days[d.id] = d;
};

export interface Agg extends Totals { ids: string[]; per: (Totals & { id: string; buy: number | null; sell: number | null })[] }

const KEYS: readonly (keyof Totals)[] = ['sales', 'sw', 'mk', 'comm', 'extra', 'tot', 'sn', 'purch', 'pw', 'pn', 'pk', 'pkw', 'pj', 'pjw', 'exp', 'en'];

/** مجاميع عدة أيام (agg). */
export function agg(ids: string[]): Agg {
  const A = { ids, per: [] } as unknown as Agg;
  KEYS.forEach((k) => { A[k] = 0; });
  for (const id of ids) {
    const d = S.days[id]!; const t = T(d);
    KEYS.forEach((k) => { A[k] = r2(A[k] + t[k]); });
    A.per.push({ id, buy: d.buy, sell: d.sell, ...t });
  }
  return A;
}

export const idsIn = (f: string, t: string): string[] => dayIds().filter((id) => id >= f && id <= t);
export const weekStartOf = (id: string): string => add(id, -((dow(id) - S.branch.weekStart + 7) % 7));

export interface Range { from: string; to: string; label: string; prev: { from: string; to: string; cmp: string; name: string } | null }

/** حدود الفترة المختارة (periodRange). */
export function periodRange(P: Period): Range {
  if (P.kind === 'day') {
    const prev = dayIds().filter((x) => x < P.anchor).slice(-1)[0];
    return { from: P.anchor, to: P.anchor, label: dayLong(P.anchor), prev: prev ? { from: prev, to: prev, cmp: `عن ${dayShort(prev)}`, name: dayShort(prev) } : null };
  }
  if (P.kind === 'week') {
    const f = weekStartOf(P.anchor); const t = add(f, 6);
    return { from: f, to: t, label: spanLabel(f, t), prev: { from: add(f, -7), to: add(f, -1), cmp: 'عن الأسبوع السابق', name: 'الأسبوع السابق' } };
  }
  if (P.kind === 'month') {
    const f = monthStart(P.anchor); const t = monthEnd(P.anchor); const pf = monthStart(add(f, -1));
    return { from: f, to: t, label: monthLabel(f), prev: { from: pf, to: monthEnd(pf), cmp: 'عن الشهر السابق', name: monthLabel(pf) } };
  }
  const a = P.from ?? P.anchor; const b = P.to ?? P.anchor;
  const f = a <= b ? a : b; const t = a <= b ? b : a; const len = spanDays(f, t);
  return { from: f, to: t, label: spanLabel(f, t), prev: { from: add(f, -len), to: add(f, -1), cmp: 'عن الفترة السابقة', name: 'الفترة السابقة' } };
}

type Row = { a: number; n: number };
function groupExp(ids: readonly string[], key: (l: Day['exp'][number]) => string): [string, Row][] {
  const m = new Map<string, Row>();
  for (const id of ids) for (const l of live(S.days[id]!.exp)) {
    const k = key(l); if (!k) continue;
    const r = m.get(k) ?? { a: 0, n: 0 }; r.a = r2(r.a + l.a); r.n += 1; m.set(k, r);
  }
  return [...m.entries()].sort((a, b) => b[1].a - a[1].a);
}
export const expByCat = (ids: readonly string[]): [string, Row][] => groupExp(ids, (l) => l.c);
export const expByEmp = (ids: readonly string[]): [string, Row][] => groupExp(ids, (l) => l.emp);

export function extrasIn(ids: readonly string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const id of ids) { const d = S.days[id]!; const x = Number(d.x) || 0; if (x) { const k = d.xl || 'بند إضافي'; m.set(k, r2((m.get(k) ?? 0) + x)); } }
  return [...m.entries()];
}

/** أيام لم تُدخل بين أول يوم ونهاية الفترة. */
export function missingDays(R: { from: string; to: string }): string[] {
  const all = dayIds(); if (!all.length) return [];
  const have = new Set(all); const first = all[0]!; const last = all[all.length - 1]!; const out: string[] = [];
  const end = R.to < last ? R.to : last;
  for (let d = R.from; d <= end; d = add(d, 1)) if (d >= first && !have.has(d)) out.push(d);
  return out;
}

/** كم يوم مُدخل من أيام الفترة (لين اليوم إذا الفترة ما خلصت). الأيام الناقصة ما تنحسب صفر. */
export function coverage(R: { from: string; to: string }, n: number): { have: number; of: number; full: boolean } {
  const t = today(); const end = R.to < t ? R.to : t;
  const of = end < R.from ? 0 : spanDays(R.from, end);
  return { have: n, of, full: n >= of };
}

/** آخر نوع فترة اختاره المستخدم على هذا الجهاز (اللوحة تبدأ بآخر يوم أول مرة). */
const PKIND_KEY = { period: 'gold.pkind.dash', rperiod: 'gold.pkind.reports' } as const;
type Kind = 'day' | 'week' | 'month';
export function savedKind(key: 'period' | 'rperiod', def: Kind): Kind {
  try { const v = localStorage.getItem(PKIND_KEY[key]); return v === 'day' || v === 'week' || v === 'month' ? v : def; } catch { return def; }
}
export function saveKind(key: 'period' | 'rperiod', k: string): void {
  if (k !== 'day' && k !== 'week' && k !== 'month') return;
  try { localStorage.setItem(PKIND_KEY[key], k); } catch { /* المتصفح ما يسمح */ }
}

/** أول فترة عند فتح الصفحة: آخر يوم مُدخل، أو أسبوعه أو شهره حسب اختياره السابق. */
export const startPeriod = (key: 'period' | 'rperiod', def: Kind): Period => ({ kind: savedKind(key, def), anchor: lastDay() });

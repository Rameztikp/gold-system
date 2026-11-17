/**
 * حسابات اليوم — نفس منطق النموذج v16 (prototype/app.js: W, T, CMP_ROWS, sameLine, describe, diffText).
 * القيم على السلك (wire) بالدرهم والجرام كما في النموذج؛ الجمع يتم بأعداد صحيحة (فلس، أجزاء المئة من الجرام)
 * حتى لا تتراكم أخطاء الكسور العشرية.
 */

export type Sec = 'sales' | 'purch' | 'exp';
export type DayStatus = 'open' | 'ok' | 'lerr';
export type PurchType = 'كسر' | 'جديد';
export type PhotoLabel = 'sales' | 'cash' | 'other';

export interface Cancel { r: string; at: number; who: string }
interface LineBase { id: string; d: string; x?: Cancel | null; v?: number }
export interface SaleLine extends LineBase { g: number | null; m: string; k: string; mk: number | null; p: number }
export interface PurchLine extends LineBase { g: number | null; m: string; a: number; t: PurchType }
export interface ExpLine extends LineBase { c: string; emp: string; a: number }
export type AnyLine = SaleLine | PurchLine | ExpLine;

export interface Photo { id: string; label: PhotoLabel; at: number; who: string }

export type CmpKey = 'sales' | 'sw' | 'mk' | 'tot' | 'purch' | 'pw';
export type LedgerVals = Partial<Record<CmpKey, number>>;

export interface Day {
  id: string;
  buy: number;
  sell: number | null;
  comm: number | null;
  xl: string;
  x: number | null;
  status: DayStatus;
  note: string;
  ledger: LedgerVals;
  sales: SaleLine[];
  purch: PurchLine[];
  exp: ExpLine[];
  photos: Photo[];
  v?: number;
}

export const hasVal = (v: unknown): boolean => v !== null && v !== undefined && v !== '';
export const r2 = (n: unknown): number => Math.round((Number(n) || 0) * 100) / 100;
/** درهم → فلس (عدد صحيح). */
export const toFils = (n: unknown): number => Math.round((Number(n) || 0) * 100);

/** الوزن بأجزاء المئة من الجرام: الملي برقم واحد أعشار (3 = 0.30)، وبرقمين أجزاء من مئة (03 = 0.03). */
export function weightCg(g: number | string | null | undefined, m: string | null | undefined): number | null {
  const hasG = hasVal(g);
  const hasM = hasVal(m);
  if (!hasG && !hasM) return null;
  const gg = hasG ? Math.trunc(Number(g)) : 0;
  if (!hasM) return gg * 100;
  const ms = String(m);
  return gg * 100 + (ms.length === 1 ? Number(ms) * 10 : Number(ms));
}

/** الوزن بالجرام كما في النموذج (W)، أو null إذا السطر بلا وزن. */
export function W(g: number | string | null | undefined, m: string | null | undefined): number | null {
  const cg = weightCg(g, m);
  return cg === null ? null : cg / 100;
}

export const live = <L extends AnyLine>(a: readonly L[]): L[] => a.filter((l) => !l.x);

const sumFils = <L>(a: readonly L[], f: (l: L) => unknown): number => a.reduce((t, l) => t + toFils(f(l)), 0);
const sumCg = (a: readonly (SaleLine | PurchLine)[]): number => a.reduce((t, l) => t + (weightCg(l.g, l.m) ?? 0), 0);

export interface Totals {
  sales: number; sw: number; mk: number; comm: number; extra: number; tot: number; sn: number;
  purch: number; pw: number; pn: number; pk: number; pkw: number; pj: number; pjw: number;
  exp: number; en: number;
}

function salesPart(day: Day) {
  const s = live(day.sales);
  const mk = sumFils(s, (l) => l.mk);
  const comm = toFils(day.comm);
  const extra = toFils(day.x);
  return { sales: sumFils(s, (l) => l.p), sw: sumCg(s), mk, comm, extra, tot: mk + comm + extra, sn: s.length };
}

function purchPart(day: Day) {
  const p = live(day.purch);
  const pk = p.filter((l) => l.t !== 'جديد');
  const pj = p.filter((l) => l.t === 'جديد');
  return {
    purch: sumFils(p, (l) => l.a), pw: sumCg(p), pn: p.length,
    pk: sumFils(pk, (l) => l.a), pkw: sumCg(pk), pj: sumFils(pj, (l) => l.a), pjw: sumCg(pj),
  };
}

/** مجاميع اليوم (T في النموذج). الملغى لا يدخل أي مجموع. إجمالي الأجور = الأجور + العمولة + البند الإضافي. */
export function T(day: Day): Totals {
  const s = salesPart(day);
  const p = purchPart(day);
  const e = live(day.exp);
  const ints = { ...s, ...p, exp: sumFils(e, (l) => l.a), en: e.length };
  const out = {} as Totals;
  for (const k of Object.keys(ints) as (keyof Totals)[]) {
    out[k] = k === 'sn' || k === 'pn' || k === 'en' ? ints[k] : ints[k] / 100;
  }
  return out;
}

export const TOTAL_KEYS: readonly (keyof Totals)[] = [
  'sales', 'sw', 'mk', 'comm', 'extra', 'tot', 'sn', 'purch', 'pw', 'pn', 'pk', 'pkw', 'pj', 'pjw', 'exp', 'en',
];

/** جمع مجاميع عدة أيام بأعداد صحيحة. */
export function sumTotals(list: readonly Totals[]): Totals {
  const acc = {} as Totals;
  for (const k of TOTAL_KEYS) {
    const isCount = k === 'sn' || k === 'pn' || k === 'en';
    const s = list.reduce((t, x) => t + (isCount ? x[k] : toFils(x[k])), 0);
    acc[k] = isCount ? s : s / 100;
  }
  return acc;
}

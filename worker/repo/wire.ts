import type { Day, ExpLine, Photo, PurchLine, SaleLine, CmpKey, LedgerVals } from '../../shared/domain';
import type { DayRow, LineRow, PhotoRow } from './ledger';

/** تحويل صفوف قاعدة البيانات (فلس، أجزاء المئة من الجرام) إلى شكل النموذج على السلك (درهم، جرام). */

const dh = (fils: number | null): number | null => (fils === null ? null : fils / 100);

function cancelOf(l: LineRow): SaleLine['x'] {
  return l.xReason ? { r: l.xReason, at: l.xAt ?? 0, who: l.xBy ?? '' } : null;
}

export function lineToWire(l: LineRow): SaleLine | PurchLine | ExpLine {
  const base = { id: l.id, d: l.d, x: cancelOf(l), v: l.version };
  if (l.sec === 'sales') return { ...base, g: l.g, m: l.m, k: l.k, mk: dh(l.mkFils), p: l.amountFils / 100 };
  if (l.sec === 'purch') return { ...base, g: l.g, m: l.m, a: l.amountFils / 100, t: l.t === 'جديد' ? 'جديد' : 'كسر' };
  return { ...base, c: l.c, emp: l.emp, a: l.amountFils / 100 };
}

const LEDGER_COLS: [CmpKey, keyof DayRow][] = [['sales', 'lSales'], ['sw', 'lSw'], ['mk', 'lMk'], ['tot', 'lTot'], ['purch', 'lPurch'], ['pw', 'lPw']];

export function ledgerOf(d: DayRow): LedgerVals {
  const out: LedgerVals = {};
  for (const [k, col] of LEDGER_COLS) {
    const v = d[col] as number | null;
    if (v !== null) out[k] = v / 100;
  }
  return out;
}

export function ledgerCols(l: LedgerVals): Pick<DayRow, 'lSales' | 'lSw' | 'lMk' | 'lTot' | 'lPurch' | 'lPw'> {
  const f = (v: number | undefined): number | null => (v === undefined ? null : Math.round(v * 100));
  return { lSales: f(l.sales), lSw: f(l.sw), lMk: f(l.mk), lTot: f(l.tot), lPurch: f(l.purch), lPw: f(l.pw) };
}

export const photoToWire = (p: PhotoRow): Photo => ({ id: p.id, label: p.label, at: p.createdAt, who: p.createdBy });

export function dayToWire(d: DayRow, lines: readonly LineRow[], photos: readonly PhotoRow[]): Day {
  const of = <T>(sec: LineRow['sec']): T[] => lines.filter((l) => l.sec === sec).map((l) => lineToWire(l) as T);
  return {
    id: d.date, buy: d.buyFils / 100, sell: dh(d.sellFils), comm: dh(d.commFils), xl: d.xLabel, x: dh(d.xFils),
    status: d.status, note: d.note, ledger: ledgerOf(d),
    sales: of<SaleLine>('sales'), purch: of<PurchLine>('purch'), exp: of<ExpLine>('exp'),
    photos: photos.map(photoToWire), v: d.version,
  };
}

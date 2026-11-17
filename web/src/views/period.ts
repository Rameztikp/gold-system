/* اختيار الفترة (اللوحة والتقارير والبحث). */
import { D, ID, add, monthStart } from '../util';
import { S, U, dayIds, lastDay, type Period, type Range } from '../state';

export type PKey = 'period' | 'rperiod' | 'qperiod';
export const pkey = (p: string | undefined): PKey => (p === 'r' ? 'rperiod' : p === 'q' ? 'qperiod' : 'period');

export function periodCtl(P: Period, R: Range, opts: { p: string; range: boolean }): string {
  const kinds: [string, string][] = [['day', 'يوم'], ['week', 'أسبوع'], ['month', 'شهر'], ...(opts.range ? [['range', 'فترة'] as [string, string]] : [])];
  const segs = kinds.map(([k, l]) => `<button type="button" role="tab" data-act="pkind" data-p="${opts.p}" data-k="${k}" aria-selected="${P.kind === k}">${l}</button>`).join('');
  return `<div class="seg" role="tablist" aria-label="المدة">${segs}</div>${periodNav(P, R, opts.p)}`;
}

export function periodNav(P: Period, R: Range, p: string): string {
  return P.kind === 'range'
    ? `<div class="range"><label for="${p}rf">من</label><input type="date" id="${p}rf" data-act-change="from" data-p="${p}" value="${R.from}"><label for="${p}rt">إلى</label><input type="date" id="${p}rt" data-act-change="to" data-p="${p}" value="${R.to}"></div>`
    : `<div class="pnav"><button type="button" class="arw" data-act="pmove" data-p="${p}" data-d="-1" aria-label="الفترة السابقة">›</button><b>${R.label}</b><button type="button" class="arw" data-act="pmove" data-p="${p}" data-d="1" aria-label="الفترة التالية">‹</button></div>`;
}

/** تغيير نوع الفترة (pkind). */
export function setKind(key: PKey, k: Period['kind']): void {
  const P = U[key] ?? { kind: 'month', anchor: lastDay() };
  if (k === 'range') U[key] = { kind: 'range', anchor: P.anchor, from: monthStart(P.anchor), to: P.anchor > lastDay() ? lastDay() : P.anchor };
  else U[key] = { kind: k, anchor: k === 'day' ? (S.days[P.anchor] ? P.anchor : (dayIds().filter((x) => x <= P.anchor).slice(-1)[0] ?? lastDay())) : P.anchor };
}

/** الفترة السابقة أو التالية (pmove). */
export function movePeriod(key: PKey, dir: number): void {
  const P = U[key]; if (!P) return;
  const ids = dayIds();
  if (P.kind === 'day') { const n = dir < 0 ? ids.filter((x) => x < P.anchor).slice(-1)[0] : ids.find((x) => x > P.anchor); if (n) P.anchor = n; }
  else if (P.kind === 'week') P.anchor = add(P.anchor, 7 * dir);
  else if (P.kind === 'month') { const t = D(monthStart(P.anchor)); t.setUTCMonth(t.getUTCMonth() + dir); P.anchor = ID(t); }
}

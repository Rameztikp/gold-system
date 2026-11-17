/* الرسم: سلسلة واحدة لكل يوم، والزمن من اليمين لليسار (chartBars). */
import { $$, esc, int, money, pr, dayMid, dnum, dow, DAYS_AR, C } from '../util';
import { dash } from './dash';

function niceStep(raw: number): number { const p = Math.pow(10, Math.floor(Math.log10(raw))); const f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
function axisTicks(max: number): { top: number; t: number[] } { const st = niceStep(max / 4); const top = Math.ceil(max / st) * st; const t: number[] = []; for (let v = 0; v <= top + st / 2; v += st) t.push(v); return { top, t }; }
interface Box { x: number; y: number; w: number; h: number }
function roundTop(b: Box, r: number): string {
  const { x, y, w, h } = b;
  if (h < 0.5) return `M${x},${y}h${w}`;
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

type Series = 'sales' | 'purch' | 'tot';
const LABEL: Record<Series, string> = { sales: 'المبيعات', purch: 'المشتريات', tot: 'إجمالي الأجور' };

function chartBars(w: number, series: Series): string {
  const per = dash().A.per; const n = per.length; if (!n) return '';
  const color = C[series]; const label = LABEL[series];
  const H = 232; const pt = 26; const pb = 46; const ph = H - pt - pb; const PR = 58; const PL = 8;
  const vals = per.map((p) => p[series]);
  const { top, t } = axisTicks(Math.max(1, ...vals));
  const y = (v: number): number => pt + ph - (v / top) * ph;
  const pw = w - PL - PR; const band = pw / n; const cx = (i: number): number => PL + pw - (i + 0.5) * band;
  const bw = Math.max(4, Math.min(24, band * 0.56)); const every = Math.max(1, Math.ceil(26 / band));
  const iMax = vals.indexOf(Math.max(...vals));
  let s = '';
  for (const v of t) s += `<line class="gl" x1="${PL}" x2="${w - PR}" y1="${y(v)}" y2="${y(v)}" stroke-width="1"/><text x="${w - PR + 10}" y="${y(v) + 4}" class="ax">${int(v)}</text>`;
  per.forEach((p, i) => {
    const x = cx(i); const v = vals[i]!;
    s += `<path d="${roundTop({ x: x - bw / 2, y: y(v), w: bw, h: ph - (y(v) - pt) }, 4)}" style="fill:${color};stroke:${color};stroke-width:${v > 0 ? 0 : 1}"/>`;
    if (i === iMax && n > 1 && v > 0) s += `<text x="${x}" y="${y(v) - 8}" text-anchor="middle" class="lbl">${int(v)}</text>`;
    if (i % every === 0) s += `<text x="${x}" y="${H - pb + 18}" text-anchor="middle" class="ax-d">${dnum(p.id)}</text>${band >= 44 ? `<text x="${x}" y="${H - pb + 34}" text-anchor="middle" class="ax-w">${DAYS_AR[dow(p.id)]}</text>` : ''}`;
    const tipTxt = `${dayMid(p.id)}&#10;${label}: ${money(v)}${p.sell !== null && series !== 'purch' ? `&#10;سعر البيع: ${pr(p.sell)}` : ''}&#10;سعر الشراء: ${pr(p.buy)}`;
    s += `<rect class="hit" x="${x - band / 2}" y="${pt}" width="${band}" height="${ph}" data-tip="${esc(tipTxt).replace(/&amp;#10;/g, '&#10;')}" data-act="pday" data-id="${p.id}" style="cursor:pointer"/>`;
  });
  s += `<line class="bl" x1="${PL}" x2="${w - PR}" y1="${pt + ph}" y2="${pt + ph}" stroke-width="1"/>`;
  return `<svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" role="img" aria-label="${label} لكل يوم" style="direction:ltr;display:block">${s}</svg>`;
}

export function drawCharts(): void {
  $$('[data-chart]').forEach((el) => {
    const cs = getComputedStyle(el); const w = Math.max(240, Math.floor(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
    el.innerHTML = chartBars(w, el.dataset.series as Series);
  });
}

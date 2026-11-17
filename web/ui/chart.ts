import { html, type Safe } from '../core/dom';
import { money, shortDate } from '../core/format';

const W = 720;
const H = 180;
const PAD = 20;

/** رسم أعمدة يومي (SVG بخصائص فقط، بدون style — يتوافق مع CSP). */
export function barChart(series: { date: string; salesFils: number }[]): Safe {
  const max = Math.max(1, ...series.map((s) => s.salesFils));
  const bw = (W - PAD * 2) / Math.max(1, series.length);
  const bars = series.map((s, i) => {
    const h = Math.round(((H - PAD * 2) * s.salesFils) / max);
    const x = W - PAD - (i + 1) * bw + bw * 0.15;
    return html`<rect class="bar" x="${x.toFixed(1)}" y="${H - PAD - h}" width="${(bw * 0.7).toFixed(1)}" height="${h}" rx="2">
      <title>${shortDate(s.date)}: ${money(s.salesFils)}</title></rect>`;
  });
  const labelEvery = Math.ceil(series.length / 8);
  const labels = series.map((s, i) => (i % labelEvery === 0
    ? html`<text class="axis" x="${(W - PAD - (i + 0.5) * bw).toFixed(1)}" y="${H - 4}" text-anchor="middle">${s.date.slice(8)}</text>` : html``));
  return html`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">${bars}${labels}</svg>`;
}

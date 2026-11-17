import { html, render, on, type Safe } from '../core/dom';
import { T } from '../texts';
import { api, qs, errorText } from '../core/api';
import { longDate, monthName, shortDate, today } from '../core/format';
import { addDays } from '../../shared/domain';
import type { Dashboard } from '../core/types';
import { shell, loading } from '../ui/shell';
import { periodBar, type Period } from '../ui/period';
import { totalsCards, statusBadge } from '../ui/cards';
import { barChart } from '../ui/chart';

const view = { period: 'day' as Period, date: '' };

function label(d: Dashboard): string {
  if (view.period === 'day') return longDate(view.date);
  if (view.period === 'month') return monthName(view.date);
  return `${shortDate(d.range.from)} – ${shortDate(d.range.to)}`;
}

const attentionCard = (d: Dashboard): Safe => html`<div class="panel attention"><h3>${T.dash.attention}</h3>
  ${d.attention.length === 0 ? html`<p class="muted">${T.dash.allGood}</p>` : html`<ul class="att-list">${d.attention.slice(0, 8).map((a) =>
    html`<li><a href="#/day/${a.id}">${longDate(a.date)}</a> ${statusBadge(a.status)}</li>`)}</ul>`}</div>`;

const page = (d: Dashboard): Safe => html`${periodBar(view.period, label(d))}${attentionCard(d)}${totalsCards(d.totals)}
  ${view.period === 'day' ? html`` : html`<div class="panel"><h3>${T.dash.chart}</h3>${barChart(d.series)}</div>`}`;

function shift(n: number): void {
  const step = view.period === 'day' ? 1 : view.period === 'week' ? 7 : 0;
  if (step) view.date = addDays(view.date, n * step);
  else {
    const [y, m] = view.date.split('-').map(Number);
    const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1 + n, 1));
    view.date = dt.toISOString().slice(0, 10);
  }
}

async function load(el: HTMLElement): Promise<void> {
  try {
    const d = await api.get<Dashboard>(`/dashboard${qs({ period: view.period, date: view.date })}`);
    render(el, page(d));
  } catch (e) {
    render(el, html`<p class="error">${errorText(e)}</p>`);
  }
}

export function dashboardScreen(): void {
  if (!view.date) view.date = today();
  const el = shell(T.nav.dashboard, loading());
  on(el, 'click [data-period]', (_e, b) => { view.period = b.dataset.period as Period; void load(el); });
  on(el, 'click [data-shift]', (_e, b) => { shift(Number(b.dataset.shift)); void load(el); });
  on(el, 'click [data-today]', () => { view.date = today(); void load(el); });
  void load(el);
}

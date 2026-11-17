import { html, render, on, type Safe } from '../core/dom';
import { T } from '../texts';
import { api, qs, errorText } from '../core/api';
import { longDate, money, grams } from '../core/format';
import type { LineDto } from '../core/types';
import { shell } from '../ui/shell';

let lastQuery = '';

const result = (l: LineDto): Safe => html`<a class="day-row ${l.cancelled ? 'cancelled' : ''}" href="#/day/${l.dayId}">
  <span class="day-date">${longDate(l.date ?? '')}</span><span class="badge">${T.kinds[l.kind]}</span>
  <span class="grow">${l.description}</span><span class="num">${l.kind === 'expense' ? '' : grams(l.weightCg)}</span><span class="num">${money(l.amountFils)}</span></a>`;

async function run(out: HTMLElement, q: string): Promise<void> {
  lastQuery = q;
  if (!q.trim()) { render(out, html`<p class="muted">${T.search.hint}</p>`); return; }
  try {
    const r = await api.get<{ results: LineDto[] }>(`/search${qs({ q })}`);
    if (q !== lastQuery) return;
    render(out, r.results.length ? html`${r.results.map(result)}` : html`<p class="muted">${T.search.none}</p>`);
  } catch (e) { render(out, html`<p class="error">${errorText(e)}</p>`); }
}

export function searchScreen(): void {
  const el = shell(T.search.title, html`<input class="search-input" type="search" name="q" placeholder="${T.search.placeholder}" value="${lastQuery}" autofocus>
    <div class="panel list" data-out></div>`);
  const out = el.querySelector<HTMLElement>('[data-out]');
  if (!out) return;
  let timer = 0;
  on(el, 'input [name=q]', (_e, i) => {
    clearTimeout(timer);
    timer = window.setTimeout(() => void run(out, (i as HTMLInputElement).value), 250);
  });
  void run(out, lastQuery);
}

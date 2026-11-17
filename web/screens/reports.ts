import { html, render, on, val, type Safe } from '../core/dom';
import { T } from '../texts';
import { api, qs, errorText } from '../core/api';
import { longDate, money, shortDate, today, grams } from '../core/format';
import { monthRange, lineWagesTotal } from '../../shared/domain';
import type { LineDto, RangeReport } from '../core/types';
import { state } from '../core/state';
import { shell } from '../ui/shell';
import { totalsCards, statusBadge } from '../ui/cards';

const ui = { from: '', to: '', detail: false };

const form = (): Safe => html`<form class="toolbar no-print" data-range>
  <label class="inline">${T.reports.from}<input type="date" name="from" value="${ui.from}"></label>
  <label class="inline">${T.reports.to}<input type="date" name="to" value="${ui.to}"></label>
  <div class="segmented"><button type="button" class="${ui.detail ? '' : 'on'}" data-detail="0">${T.reports.summary}</button>
    <button type="button" class="${ui.detail ? 'on' : ''}" data-detail="1">${T.reports.detail}</button></div>
  <button class="btn primary">${T.reports.show}</button><button type="button" class="btn" data-print>${T.reports.print}</button></form>`;

const summaryTable = (r: RangeReport): Safe => html`<table class="table"><thead><tr><th>${T.days.date}</th><th>${T.dash.sales}</th>
  <th>${T.dash.purchases}</th><th>${T.dash.expenses}</th><th>${T.dash.wages}</th><th></th></tr></thead>
  <tbody>${[...r.days].reverse().map((d) => html`<tr><td>${longDate(d.date)}</td><td class="num">${money(d.totals.salesFils)}</td>
  <td class="num">${money(d.totals.purchasesFils)}</td><td class="num">${money(d.totals.expensesFils)}</td>
  <td class="num">${money(d.totals.wagesFils)}</td><td>${statusBadge(d.status)}</td></tr>`)}</tbody></table>`;

const detailRow = (l: LineDto): Safe => html`<tr class="${l.cancelled ? 'cancelled' : ''}"><td>${shortDate(l.date ?? '')}</td><td>${T.kinds[l.kind]}</td>
  <td>${l.description}</td><td class="num">${l.kind === 'expense' ? '' : l.pieces}</td><td class="num">${l.kind === 'expense' ? '' : grams(l.weightCg)}</td>
  <td class="num">${money(l.amountFils)}</td><td class="num">${l.kind === 'sale' ? money(lineWagesTotal(l)) : ''}</td></tr>`;

const detailTable = (r: RangeReport): Safe => html`<table class="table"><thead><tr><th>${T.days.date}</th><th>${T.reports.kind}</th>
  <th>${T.line.description}</th><th>${T.line.pieces}</th><th>${T.line.weight}</th><th>${T.line.amount}</th><th>${T.dash.wages}</th></tr></thead>
  <tbody>${(r.lines ?? []).map(detailRow)}</tbody></table>`;

const page = (r: RangeReport): Safe => html`  <div class="print-head"><h2>${state.settings?.name} — ${T.reports.title}</h2><p>${longDate(r.range.from)} – ${longDate(r.range.to)}</p></div>
  ${totalsCards(r.totals)}<div class="panel">${ui.detail ? detailTable(r) : summaryTable(r)}</div>`;

async function load(out: HTMLElement): Promise<void> {
  try {
    const q = { from: ui.from, to: ui.to, ...(ui.detail ? { detail: 1 } : {}) };
    render(out, page(await api.get<RangeReport>(`/reports${qs(q)}`)));
  } catch (e) { render(out, html`<p class="error">${errorText(e)}</p>`); }
}

function setDetail(el: HTMLElement, detail: boolean): void {
  ui.detail = detail;
  el.querySelectorAll<HTMLElement>('[data-detail]').forEach((b) => b.classList.toggle('on', (b.dataset.detail === '1') === detail));
}

/** التقارير: الملخص والتفصيلي، مع الطباعة و PDF (من نافذة الطباعة). */
export function reportsScreen(): void {
  if (!ui.from) Object.assign(ui, monthRange(today()));
  const el = shell(T.reports.title, html`${form()}<div data-out></div>`);
  const out = el.querySelector<HTMLElement>('[data-out]');
  if (!out) return;
  on(el, 'submit [data-range]', (e, f) => { e.preventDefault(); ui.from = val(f, 'from'); ui.to = val(f, 'to'); void load(out); });
  on(el, 'click [data-detail]', (_e, b) => { setDetail(el, b.dataset.detail === '1'); void load(out); });
  on(el, 'click [data-print]', () => window.print());
  void load(out);
}

import { html, render, on, val, type Safe } from '../core/dom';
import { T } from '../texts';
import { api, qs, errorText } from '../core/api';
import { longDate, money, monthName, today } from '../core/format';
import { addDays, monthRange } from '../../shared/domain';
import type { DayDto, RangeReport } from '../core/types';
import { shell, loading } from '../ui/shell';
import { statusBadge } from '../ui/cards';
import { openModal } from '../ui/modal';
import { toast } from '../ui/toast';
import { go } from '../core/router';

let month = '';

const row = (d: RangeReport['days'][number]): Safe => html`<a class="day-row" href="#/day/${d.id}">
  <span class="day-date">${longDate(d.date)}</span>${statusBadge(d.status)}
  <span class="num">${money(d.totals.salesFils)}</span><span class="num muted">${money(d.totals.purchasesFils)}</span></a>`;

const page = (r: RangeReport): Safe => html`<div class="toolbar">
  <button class="btn primary" data-new>＋ ${T.days.newDay}</button>
  <label class="inline">${T.days.month}<input type="month" name="month" value="${month}"></label></div>
  <h3 class="muted">${monthName(`${month}-01`)}</h3>
  <div class="panel list">${r.days.length === 0 ? html`<p class="muted">${T.days.empty}</p>` : r.days.map(row)}</div>`;

async function load(el: HTMLElement): Promise<void> {
  try {
    render(el, page(await api.get<RangeReport>(`/days${qs(monthRange(`${month}-01`))}`)));
  } catch (e) {
    render(el, html`<p class="error">${errorText(e)}</p>`);
  }
}

/** يوم جديد: الافتراضي اليوم التالي لآخر يوم مُدخل. */
export async function newDayModal(): Promise<void> {
  const latest = await api.get<{ day: DayDto | null }>('/days/latest').catch(() => ({ day: null }));
  const def = latest.day ? addDays(latest.day.date, 1) : today();
  const m = openModal(T.days.newDay, html`<form class="stack" data-f><label>${T.days.date}<input type="date" name="date" value="${def}" required></label>
    <button class="btn primary block">${T.days.create}</button></form>`);
  m.el.querySelector('[data-f]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    api.post<DayDto>('/days', { date: val(m.el, 'date') })
      .then((d) => { m.close(); go(`/day/${d.id}`); })
      .catch((err) => toast(errorText(err), 'error'));
  });
}

export function daysScreen(): void {
  if (!month) month = today().slice(0, 7);
  const el = shell(T.days.title, loading());
  on(el, 'click [data-new]', () => void newDayModal());
  on(el, 'change [name=month]', (_e, i) => { month = (i as HTMLInputElement).value || month; void load(el); });
  void load(el);
}

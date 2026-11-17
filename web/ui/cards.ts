import { html, type Safe } from '../core/dom';
import { T } from '../texts';
import { money, weight } from '../core/format';
import type { Totals } from '../core/types';

const card = ({ title, value, sub, cls }: { title: string; value: string; sub: string; cls: string }): Safe =>
  html`<div class="stat ${cls}"><div class="stat-title">${title}</div><div class="stat-value">${value}</div><div class="stat-sub">${sub}</div></div>`;

/** أربع بطاقات: المبيعات، المشتريات، المصروفات، إجمالي الأجور. */
export const totalsCards = (t: Totals): Safe => html`<div class="stats">
  ${card({ title: T.dash.sales, value: money(t.salesFils), sub: `${t.salesPieces} ${T.dash.pieces} · ${weight(t.salesCg)}`, cls: 'sales' })}
  ${card({ title: T.dash.purchases, value: money(t.purchasesFils), sub: weight(t.purchasesCg), cls: 'purchases' })}
  ${card({ title: T.dash.expenses, value: money(t.expensesFils), sub: `${t.expensesCount} ${T.dash.lines}`, cls: 'expenses' })}
  ${card({ title: T.dash.wages, value: money(t.wagesFils), sub: '', cls: 'wages' })}</div>`;

export const statusBadge = (s: keyof typeof T.status): Safe => html`<span class="badge ${s}">${T.status[s]}</span>`;

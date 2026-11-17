import { html, type Safe } from '../core/dom';
import { T } from '../texts';

export type Period = 'day' | 'week' | 'month';

export const periodBar = (p: Period, label: string): Safe => html`<div class="period-bar">
  <div class="segmented" role="tablist">${(['day', 'week', 'month'] as const).map((k) =>
    html`<button role="tab" class="${k === p ? 'on' : ''}" data-period="${k}">${T.period[k]}</button>`)}</div>
  <div class="date-nav"><button class="icon-btn" data-shift="-1" aria-label="${T.period.prev}">→</button>
    <span class="period-label">${label}</span>
    <button class="icon-btn" data-shift="1" aria-label="${T.period.next}">←</button>
    <button class="btn ghost small" data-today>${T.period.today}</button></div></div>`;

import { html, render, on, val, type Safe } from '../core/dom';
import { T } from '../texts';
import { api, errorText } from '../core/api';
import { longDate, money, moneyInput, grams } from '../core/format';
import { parseAmount, lineWagesTotal } from '../../shared/domain';
import type { DayView, LineDto, LineKind } from '../core/types';
import { state } from '../core/state';
import { shell, loading } from '../ui/shell';
import { statusBadge } from '../ui/cards';
import { toast } from '../ui/toast';
import { openLineModal } from './line-modal';
import { compareStep, readLedger } from './compare';
import { photosStrip, showPhoto, uploadPhotos } from './photos';
import { daySummaryText, whatsappUrl } from '../core/whatsapp';

const KINDS: LineKind[] = ['sale', 'purchase', 'expense'];
const ui = { step: 0, dayId: '' };

const header = (v: DayView): Safe => html`<div class="panel day-head">
  <div class="day-title"><h2>${longDate(v.day.date)}</h2>${statusBadge(v.day.status)}</div>
  <form class="day-fields" data-head>
    <label>${T.day.price}<input name="price" inputmode="decimal" value="${moneyInput(v.day.goldPriceFils ?? 0)}"></label>
    <label class="grow">${T.day.note}<input name="note" value="${v.day.note}" maxlength="500"></label>
    <button class="btn">${T.day.save}</button></form>
  <div class="day-tools"><a class="btn ghost" target="_blank" rel="noopener" href="${whatsappUrl(daySummaryText({ branch: state.settings?.name ?? T.appName, date: v.day.date, totals: v.totals, status: v.day.status }))}">${T.day.whatsapp}</a>
    <button class="btn ghost" data-print>${T.day.print}</button></div>
  <details class="photos-box"><summary>${T.day.photos} (${v.photos.length})</summary>${photosStrip(v.photos)}</details></div>`;

const steps = (): Safe => html`<div class="steps" role="tablist">${T.day.steps.map((s, i) =>
  html`<button role="tab" class="${i === ui.step ? 'on' : ''}" data-step="${i}"><span class="step-n">${i + 1}</span>${s}</button>`)}</div>`;

function lineRow(l: LineDto, i: number): Safe {
  const goods = l.kind !== 'expense';
  return html`<tr class="${l.cancelled ? 'cancelled' : ''}" data-line="${l.id}" tabindex="0"><td class="muted">${i + 1}</td>
    <td>${l.description}${l.cancelled ? html` <span class="badge not_compared">${T.day.cancelled}</span>` : html``}</td>
    ${goods ? html`<td class="num">${l.pieces}</td><td class="num">${grams(l.weightCg)}</td>` : html``}
    <td class="num">${money(l.amountFils)}</td>${l.kind === 'sale' ? html`<td class="num">${money(lineWagesTotal(l))}</td>` : html``}</tr>`;
}

function linesTable(v: DayView, kind: LineKind): Safe {
  const rows = v.lines.filter((l) => l.kind === kind);
  const t = v.totals;
  const goods = kind !== 'expense';
  const total = kind === 'sale' ? t.salesFils : kind === 'purchase' ? t.purchasesFils : t.expensesFils;
  return html`<div class="panel"><div class="toolbar"><button class="btn primary" data-add="${kind}">＋ ${T.day.addLine}</button></div>
  ${rows.length === 0 ? html`<p class="muted">${T.day.empty}</p>` : html`<table class="table lines"><thead><tr><th>#</th><th>${T.line.description}</th>
    ${goods ? html`<th>${T.line.pieces}</th><th>${T.line.weight}</th>` : html``}<th>${T.line.amount}</th>${kind === 'sale' ? html`<th>${T.dash.wages}</th>` : html``}</tr></thead>
    <tbody>${rows.map(lineRow)}</tbody><tfoot><tr><th></th><th>${T.day.total}</th>
    ${goods ? html`<th class="num">${kind === 'sale' ? t.salesPieces : ''}</th><th class="num">${grams(kind === 'sale' ? t.salesCg : t.purchasesCg)}</th>` : html``}
    <th class="num">${money(total)}</th>${kind === 'sale' ? html`<th class="num">${money(t.wagesFils)}</th>` : html``}</tr></tfoot></table>`}</div>`;
}

const page = (v: DayView): Safe => html`${header(v)}${steps()}
  ${ui.step < 3 ? linesTable(v, KINDS[ui.step] ?? 'sale') : compareStep(v)}`;

let current: DayView | null = null;

async function load(el: HTMLElement): Promise<void> {
  try {
    current = await api.get<DayView>(`/days/${ui.dayId}`);
    render(el, page(current));
  } catch (e) {
    render(el, html`<p class="error">${errorText(e)}</p>`);
  }
}

function openLine(el: HTMLElement, kind: LineKind, line?: LineDto): void {
  const same = current?.lines.filter((l) => l.kind === kind && !l.cancelled) ?? [];
  openLineModal({ kind, dayId: ui.dayId, line, previous: same[same.length - 1], onSaved: () => void load(el) });
}

async function saveHeader(el: HTMLElement, form: HTMLFormElement): Promise<void> {
  if (!current) return;
  const price = parseAmount(val(form, 'price'));
  if (price === null) { toast(T.errors.invalid, 'error'); return; }
  try {
    await api.patch(`/days/${ui.dayId}`, { goldPriceFils: price === 0 ? null : price, note: val(form, 'note'), version: current.day.version });
    toast(T.day.saved);
  } catch (e) { toast(errorText(e), 'error'); }
  await load(el);
}

async function runCompare(el: HTMLElement, form: HTMLFormElement): Promise<void> {
  if (!current) return;
  const confirm = (form.elements.namedItem('confirmLedgerError') as HTMLInputElement | null)?.checked ?? false;
  try {
    current = await api.post<DayView>(`/days/${ui.dayId}/compare`, { ledger: readLedger(form), confirmLedgerError: confirm, version: current.day.version });
    toast(current.day.status === 'matched' ? T.compare.matched : T.status[current.day.status]);
    render(el, page(current));
  } catch (e) { toast(errorText(e), 'error'); await load(el); }
}

function wire(el: HTMLElement): void {
  on(el, 'click [data-step]', (_e, b) => { ui.step = Number(b.dataset.step); if (current) render(el, page(current)); });
  on(el, 'click [data-add]', (_e, b) => openLine(el, b.dataset.add as LineKind));
  on(el, 'click [data-line]', (_e, r) => {
    const l = current?.lines.find((x) => x.id === r.dataset.line);
    if (l) openLine(el, l.kind, l);
  });
  on<KeyboardEvent>(el, 'keydown [data-line]', (e, r) => { if (e.key === 'Enter') r.click(); });
  on(el, 'submit [data-head]', (e, f) => { e.preventDefault(); void saveHeader(el, f as HTMLFormElement); });
  on(el, 'submit [data-compare]', (e, f) => { e.preventDefault(); void runCompare(el, f as HTMLFormElement); });
  on(el, 'click [data-photo]', (_e, b) => showPhoto(b.dataset.photo ?? ''));
  on(el, 'change [data-upload]', (_e, i) => {
    const files = (i as HTMLInputElement).files;
    if (files) void uploadPhotos(ui.dayId, files).then(() => load(el));
  });
  on(el, 'click [data-print]', () => window.print());
}

export function dayScreen(params: Record<string, string>): void {
  if (ui.dayId !== params.id) ui.step = 0;
  ui.dayId = params.id ?? '';
  const el = shell(T.nav.days, loading());
  wire(el);
  void load(el);
}

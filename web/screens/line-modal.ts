import { html, val, type Safe } from '../core/dom';
import { T } from '../texts';
import { api, ApiError, errorText, qs } from '../core/api';
import { moneyInput } from '../core/format';
import { fromCentigrams, isSameAsPrevious, parseAmount, parseWeight, toCentigrams, uuidv7, type LineValues } from '../../shared/domain';
import type { LineDto, LineKind } from '../core/types';
import { openModal, confirmBox, type ModalHandle } from '../ui/modal';
import { toast } from '../ui/toast';

export interface LineModalOpts { kind: LineKind; dayId: string; line?: LineDto; previous?: LineDto; onSaved: () => void }

const field = (name: string, label: string, value: string): Safe =>
  html`<label class="f-${name}">${label}<input name="${name}" inputmode="decimal" value="${value}"></label>`;

function weightFields(l?: LineDto): Safe {
  const w = fromCentigrams(l?.weightCg ?? 0);
  return html`<div class="weight-row"><span class="w-label">${T.line.weight}</span>
    ${field('grams', T.line.grams, l ? String(w.grams) : '')}<span class="sep">|</span>
    ${field('milli', T.line.milli, l ? String(w.milli).padStart(2, '0') : '')}</div>`;
}

function formBody(o: LineModalOpts): Safe {
  const l = o.line;
  const goods = o.kind !== 'expense';
  return html`<form class="line-form stack" data-f autocomplete="off">
    <label class="f-desc">${T.line.description}<input name="description" value="${l?.description ?? ''}" maxlength="200">
      <ul class="suggest" data-suggest hidden></ul></label>
    ${goods ? html`<div class="grid2">${field('pieces', T.line.pieces, l ? String(l.pieces) : '1')}${field('amount', T.line.amount, moneyInput(l?.amountFils ?? 0))}</div>${weightFields(l)}`
    : field('amount', T.line.amount, moneyInput(l?.amountFils ?? 0))}
    ${o.kind === 'sale' ? html`<div class="grid3">${field('wages', T.line.wages, moneyInput(l?.wagesFils ?? 0))}
      ${field('commission', T.line.commission, moneyInput(l?.commissionFils ?? 0))}${field('extra', T.line.extra, moneyInput(l?.extraFils ?? 0))}</div>` : html``}
    <div class="actions"><button class="btn primary" data-save>${T.line.save}</button>
      ${l ? html`` : html`<button class="btn" data-save-next type="button">${T.line.saveNext}</button>`}</div></form>
    ${l ? cancelSection(l) : html``}`;
}

const cancelSection = (l: LineDto): Safe => l.cancelled
  ? html`<div class="cancel-box"><p>${T.line.cancelledBecause} ${l.cancelReason}</p><button class="btn" data-restore>${T.line.restore}</button></div>`
  : html`<details class="cancel-box"><summary>${T.line.cancel}</summary><div class="stack">
      <label>${T.line.reason}<input name="reason" maxlength="300"></label><button class="btn danger" data-cancel>${T.line.confirmCancel}</button></div></details>`;

const amt = (root: ParentNode, name: string): number => {
  const v = parseAmount(val(root, name));
  if (v === null) throw new Error('invalid');
  return v;
};

function readValues(root: ParentNode, kind: LineKind): LineValues {
  const goods = kind !== 'expense';
  const sale = kind === 'sale';
  return {
    kind, description: val(root, 'description').trim(),
    pieces: goods ? Number(val(root, 'pieces') || '0') : 0,
    weightCg: goods ? toCentigrams(parseWeight(val(root, 'grams'), val(root, 'milli'))) : 0,
    amountFils: amt(root, 'amount'),
    wagesFils: sale ? amt(root, 'wages') : 0, commissionFils: sale ? amt(root, 'commission') : 0, extraFils: sale ? amt(root, 'extra') : 0,
  };
}

async function save(o: LineModalOpts, values: LineValues, id: string): Promise<LineDto> {
  if (o.line) return api.patch<LineDto>(`/lines/${o.line.id}`, { ...values, version: o.line.version });
  return api.post<LineDto>('/lines', { ...values, id, dayId: o.dayId });
}

function handleError(e: unknown, o: LineModalOpts, m: ModalHandle): void {
  toast(errorText(e), 'error');
  if (e instanceof ApiError && e.status === 409) { m.close(); o.onSaved(); }
}

async function submit(o: LineModalOpts, m: ModalHandle, state: { id: string; next: boolean }): Promise<void> {
  let values: LineValues;
  try { values = readValues(m.el, o.kind); } catch { toast(T.errors.invalid, 'error'); return; }
  if (!o.line && isSameAsPrevious(values, o.previous) && !(await confirmBox(T.line.duplicate, { yes: T.line.yesAdd, no: T.line.no }))) return;
  try {
    const saved = await save(o, values, state.id);
    toast(T.day.saved);
    o.onSaved();
    if (!state.next) { m.close(); return; }
    m.close();
    openLineModal({ ...o, previous: saved });
  } catch (e) { handleError(e, o, m); }
}

function wireSuggest(m: ModalHandle, kind: LineKind): void {
  const input = m.el.querySelector<HTMLInputElement>('[name=description]');
  const list = m.el.querySelector<HTMLUListElement>('[data-suggest]');
  if (!input || !list) return;
  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(async () => {
      const r = await api.get<{ suggestions: string[] }>(`/suggest${qs({ kind, q: input.value })}`).catch(() => ({ suggestions: [] }));
      list.hidden = r.suggestions.length === 0;
      list.replaceChildren(...r.suggestions.map((s) => Object.assign(document.createElement('li'), { textContent: s })));
    }, 200);
  });
  list.addEventListener('mousedown', (e) => {
    const li = (e.target as Element).closest('li');
    if (li) { e.preventDefault(); input.value = li.textContent ?? ''; list.hidden = true; }
  });
  input.addEventListener('blur', () => { list.hidden = true; });
}

function wireCancel(o: LineModalOpts, m: ModalHandle): void {
  const l = o.line;
  if (!l) return;
  m.el.querySelector('[data-cancel]')?.addEventListener('click', () => {
    api.post(`/lines/${l.id}/cancel`, { reason: val(m.el, 'reason'), version: l.version })
      .then(() => { m.close(); o.onSaved(); }).catch((e) => handleError(e, o, m));
  });
  m.el.querySelector('[data-restore]')?.addEventListener('click', () => {
    api.post(`/lines/${l.id}/restore`, { version: l.version })
      .then(() => { m.close(); o.onSaved(); }).catch((e) => handleError(e, o, m));
  });
}

/** نافذة السطر: إضافة، تعديل، إلغاء بسبب، إرجاع. المعرّف ثابت للنافذة، فإعادة المحاولة لا تكرّر السطر. */
export function openLineModal(o: LineModalOpts): void {
  const title = `${o.line ? T.line.edit : T.line.add} — ${T.kinds[o.kind]}`;
  const m = openModal(title, formBody(o));
  const state = { id: uuidv7(), next: false };
  m.el.querySelector('[data-f]')?.addEventListener('submit', (e) => { e.preventDefault(); state.next = false; void submit(o, m, state); });
  m.el.querySelector('[data-save-next]')?.addEventListener('click', () => { state.next = true; void submit(o, m, state); });
  wireSuggest(m, o.kind);
  wireCancel(o, m);
  m.el.querySelector<HTMLInputElement>('[name=description]')?.focus();
}

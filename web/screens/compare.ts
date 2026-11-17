import { html, type Safe } from '../core/dom';
import { T } from '../texts';
import { formatAmount, formatWeight, parseAmount, parseWeight, toCentigrams, COMPARE_KEYS, type CompareKey, type Ledger } from '../../shared/domain';
import type { CompareItem, DayView } from '../core/types';
import { statusBadge } from '../ui/cards';

const isWeight = (k: CompareKey): boolean => k.endsWith('Cg');
const fmt = (k: CompareKey, v: number): string => (isWeight(k) ? formatWeight(v) : formatAmount(v));
const inputVal = (k: CompareKey, v: number | null): string => (v === null ? '' : fmt(k, v).replace(/,/g, ''));

function row(i: CompareItem): Safe {
  const cls = i.ledger === null ? '' : i.matched ? 'ok' : 'bad';
  return html`<tr class="${cls}"><th>${T.compare[i.key]}</th><td class="num">${fmt(i.key, i.system)}</td>
    <td><input name="l_${i.key}" inputmode="decimal" value="${inputVal(i.key, i.ledger)}"></td>
    <td class="num">${i.diff === null ? '—' : fmt(i.key, i.diff)}</td></tr>`;
}

export const compareStep = (v: DayView): Safe => {
  const hasMismatch = v.compare.some((i) => i.ledger !== null && !i.matched);
  return html`<form class="panel compare" data-compare>
    <div class="compare-head"><h3>${T.compare.title}</h3>${statusBadge(v.day.status)}</div>
    <table class="table"><thead><tr><th>${T.compare.item}</th><th>${T.compare.system}</th><th>${T.compare.ledger}</th><th>${T.compare.diff}</th></tr></thead>
    <tbody>${v.compare.map(row)}</tbody></table>
    ${hasMismatch && v.day.status !== 'ledger_error' ? html`<p class="warn">${T.compare.mismatch}</p>
      <label class="check"><input type="checkbox" name="confirmLedgerError"> ${T.compare.confirmLedger}</label>` : html``}
    <button class="btn primary">${T.compare.run}</button></form>`;
};

/** يقرأ قيم الدفتر: الفارغ = null. */
export function readLedger(form: HTMLFormElement): Ledger {
  const out = {} as Ledger;
  for (const k of COMPARE_KEYS) {
    const raw = (form.elements.namedItem(`l_${k}`) as HTMLInputElement | null)?.value.trim() ?? '';
    out[k] = raw === '' ? null : isWeight(k) ? toCentigrams(parseWeight(raw, '')) : parseAmount(raw);
  }
  return out;
}

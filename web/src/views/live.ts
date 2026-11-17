/* أثناء الكتابة: الوزن، سعر الجرام، إجمالي الأجور، المقارنة، الاقتراحات، سؤال التكرار (liveUpdate, sug*, splitDot, showDup). */
import { T, W, hasVal, normS, findWord, parseNum, r2, CMP_ROWS, isW, type AnyLine, type ExpLine, type Sec, type CmpKey } from '../../../shared/domain';
import { $$, esc, num, money, pr, g2, latin, hlText, dayLong, NO_EMP } from '../util';
import { ico } from '../icons';
import { S, U, dayIds } from '../state';

export interface Sug { d: string; k: string; n: number; c?: string; emp?: string }
export interface LiveForm extends HTMLFormElement {
  _sug?: Sug[]; _sugI?: number; _sugIdx?: Sug[] | null; _dupOK?: boolean;
  _cTouched?: boolean; _eTouched?: boolean; _cPrev?: string; _ePrev?: string;
  _bad?: [CmpKey, string, number, number][]; _filled?: number; _busy?: boolean; _lineId?: string;
  _photos?: { id: string; label: 'sales' | 'cash' | 'other'; data: string; blob: Blob }[];
}

/** خانة بالاسم. */
export const inp = (f: HTMLFormElement, name: string): HTMLInputElement | null => f.querySelector<HTMLInputElement>(`[name="${name}"]`);
export const val = (f: HTMLFormElement, name: string): string => inp(f, name)?.value ?? '';
const setHtml = (f: HTMLFormElement, out: string, html: string): void => { const o = f.querySelector(`[data-out="${out}"]`); if (o) o.innerHTML = html; };

function liveLine(f: LiveForm): void {
  const g = inp(f, 'g'); const w = g ? W(latin(g.value).trim(), latin(val(f, 'm')).trim()) : null;
  setHtml(f, 'w', `= ${num(g2(w || 0))} جم`);
  if (!f.querySelector('[data-out="ppg"]')) return;
  const a = parseNum(val(f, 'a')); const d = S.days[U.day!]!;
  const ref = `سعر الشراء اليوم ${num(pr(d.buy))}${hasVal(d.sell) ? `، وسعر البيع ${num(pr(d.sell))}` : ''}.`;
  setHtml(f, 'ppg', w && a > 0 ? `سعر الجرام ${num(money(a / w))}. ${ref}` : ref);
}

function liveDayData(f: LiveForm): void {
  const o = f.querySelector<HTMLElement>('[data-out="tot"]'); if (!o) return;
  const mk = Number(o.dataset.mk); const cm = parseNum(val(f, 'comm')) || 0; const x = parseNum(val(f, 'x')) || 0;
  o.innerHTML = `إجمالي الأجور = الأجور ${num(money(mk))} + العمولة ${num(money(cm))}${x ? ` + ${esc(val(f, 'xl').trim() || 'بند إضافي')} ${num(money(x))}` : ''} = <b class="num">${money(r2(mk + cm + x))}</b>`;
}

function compareRows(f: LiveForm): void {
  const t = T(S.days[U.day!]!); let filled = 0; const bad: LiveForm['_bad'] = [];
  for (const [k, label] of CMP_ROWS) {
    const tr = f.querySelector(`tr[data-row="${k}"]`)!; const input = inp(f, k)!; const v = parseNum(input.value); const res = tr.querySelector('[data-res]')!;
    if (isNaN(v)) { res.innerHTML = '<span class="dim">—</span>'; tr.classList.remove('bad'); input.removeAttribute('aria-invalid'); continue; }
    filled++;
    const diff = r2(t[k] - v);
    if (Math.abs(diff) < 0.005) { res.innerHTML = `<span class="pill ok">${ico('check', 13)} مطابق</span>`; tr.classList.remove('bad'); input.removeAttribute('aria-invalid'); continue; }
    res.innerHTML = `<span class="pill warn">${diff > 0 ? 'النظام أكثر بـ' : 'النظام أقل بـ'} ${isW(k) ? `${num(g2(Math.abs(diff)))} جم` : num(money(Math.abs(diff)))}</span>`;
    tr.classList.add('bad'); input.setAttribute('aria-invalid', 'true'); bad.push([k, label, v, t[k]]);
  }
  f._bad = bad; f._filled = filled;
}

function liveCompare(f: LiveForm): void {
  compareRows(f);
  const day = S.days[U.day!]!; const bad = f._bad ?? []; const filled = f._filled ?? 0;
  if (!filled || (!bad.length && day.status === 'ok')) { setHtml(f, 'verdict', ''); setHtml(f, 'acts', ''); return; }
  if (!bad.length) {
    setHtml(f, 'verdict', `<div class="verdict">كل ما كتبته مطابق للدفتر (${num(filled)} من ${num(CMP_ROWS.length)}).</div>`);
    setHtml(f, 'acts', `<button type="button" class="btn-gold" data-act="cmpok">${ico('check', 18)} احفظ: مطابق للدفتر</button>`);
    return;
  }
  const purchOnly = bad.every((b) => b[0] === 'purch' || b[0] === 'pw');
  const commHint = !hasVal(day.comm) && bad.some((b) => b[0] === 'tot') ? ' والعمولة لم تُكتب لهذا اليوم، وقد تكون هي سبب الفرق في إجمالي الأجور.' : '';
  setHtml(f, 'verdict', `<p class="err" style="margin-top:12px">فيه فرق في ${bad.length === 1 ? 'بند واحد' : bad.length === 2 ? 'بندين' : `${num(bad.length)} بنود`}. راجع السطور: غالبًا سطر لم يُدخل أو رقم كُتب خطأ. إذا كانت السطور صحيحة، فالخطأ في جمع الدفتر نفسه.${commHint}</p>`);
  setHtml(f, 'acts', `<button type="button" class="btn-gold" data-act="step" data-s="${purchOnly ? 'purch' : 'sales'}" data-top="1">راجع ${purchOnly ? 'المشتريات' : 'المبيعات'}</button>${day.status === 'lerr' ? '' : '<button type="button" class="btn-ghost" data-act="cmplerr">السطور صحيحة: احفظ مع ملاحظة «خطأ في جمع الدفتر»</button>'}`);
}

export function liveUpdate(f: HTMLFormElement | null): void {
  if (!f) return;
  const kind = f.dataset.form;
  if (kind === 'line') liveLine(f);
  else if (kind === 'daydata') liveDayData(f);
  else if (kind === 'compare') liveCompare(f);
  else if (kind === 'newday') { const d = val(f, 'date'); if (/^\d{4}-\d{2}-\d{2}$/.test(d)) setHtml(f, 'dlabel', esc(dayLong(d))); }
}

/* ---------------------------------------------------------------- اقتراحات البيان */
function sugIndex(sec: Sec): Sug[] {
  const m = new Map<string, Sug>();
  for (const id of dayIds()) for (const l of S.days[id]![sec] as AnyLine[]) {
    if (l.x) continue;
    const d = String(l.d || '').trim(); if (!d || /\.\.\.|…|^\(/.test(d)) continue;
    const k = normS(d); const r = m.get(k) ?? { d, k, n: 0 };
    r.n += 1; if (sec === 'exp') { r.c = (l as ExpLine).c; r.emp = (l as ExpLine).emp || ''; }
    m.set(k, r);
  }
  return [...m.values()];
}
export const sugIdx = (f: LiveForm): Sug[] => f._sugIdx ?? (f._sugIdx = sugIndex(f.dataset.sec as Sec));
function sugFind(f: LiveForm, q: string): Sug[] {
  const qn = normS(q); if (!qn) return [];
  return sugIdx(f).map((r) => ({ r, i: findWord(r.k, qn) })).filter((x) => x.i >= 0 && x.r.k !== qn)
    .sort((a, b) => (a.i === 0 ? 0 : 1) - (b.i === 0 ? 0 : 1) || b.r.n - a.r.n || a.r.d.localeCompare(b.r.d, 'ar'))
    .slice(0, 6).map((x) => x.r);
}
export function sugShow(f: LiveForm): void {
  const d = inp(f, 'd'); const box = f.querySelector<HTMLElement>('.sug'); if (!d || !box) return;
  const list = document.activeElement === d ? sugFind(f, d.value) : [];
  if (!list.length) { sugHide(f); return; }
  f._sug = list; f._sugI = -1;
  const qn = normS(d.value);
  box.innerHTML = list.map((r, i) => `<button type="button" class="sug-i" role="option" id="sug-${i}" data-act="sug" data-i="${i}" aria-selected="false" tabindex="-1"><span>${hlText(r.d, qn)}</span>${f.dataset.sec === 'exp' ? `<small>${esc(r.c)}${r.emp ? `، ${esc(r.emp)}` : ''}</small>` : ''}</button>`).join('');
  box.hidden = false; d.setAttribute('aria-expanded', 'true'); d.removeAttribute('aria-activedescendant');
}
export function sugHide(f: LiveForm | null): void {
  const box = f?.querySelector<HTMLElement>('.sug'); if (!f || !box) return;
  box.hidden = true; box.innerHTML = ''; f._sug = []; f._sugI = -1;
  const d = inp(f, 'd'); if (d) { d.setAttribute('aria-expanded', 'false'); d.removeAttribute('aria-activedescendant'); }
}
export function sugMove(f: LiveForm, dir: number): void {
  const n = (f._sug ?? []).length; if (!n) return;
  const cur = f._sugI ?? -1;
  f._sugI = cur < 0 ? (dir > 0 ? 0 : n - 1) : (cur + dir + n) % n;
  $$('.sug-i', f).forEach((b, i) => b.setAttribute('aria-selected', String(i === f._sugI)));
  inp(f, 'd')?.setAttribute('aria-activedescendant', `sug-${f._sugI}`);
}
// الخانات اللي ينتقل بينها Enter، بترتيبها في النافذة
export const navFields = (f: HTMLFormElement): HTMLInputElement[] => $$<HTMLInputElement>('input.in', f).filter((x) => x.type !== 'hidden' && !x.disabled && x.name !== 'xr' && !x.dataset.skip && x.offsetParent !== null);
export function sugPick(f: LiveForm, i: number): void {
  const r = (f._sug ?? [])[i]; const d = inp(f, 'd'); if (!r || !d) return;
  d.value = r.d; sugHide(f); hideDup(f);
  if (f.dataset.sec === 'exp') expAuto(f, r);
  liveUpdate(f);
  // للخانة بعد البيان (الأجور في البيع)؛ وإذا البيان آخر خانة، Enter فيها يحفظ
  const fs = navFields(f); const next = fs[fs.indexOf(d) + 1];
  (next ?? d).focus();
  if (next) next.select();
}

function setChip(f: HTMLFormElement, name: string, v: string): boolean {
  const box = f.querySelector(`[data-chips="${name}"]`); if (!box) return false;
  const b = $$<HTMLElement>('.chip', box).find((x) => x.dataset.v === v); if (!b) return false;
  $$('.chip', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); (box.nextElementSibling as HTMLInputElement).value = v; return true;
}
/** المصروف المختار من الاقتراحات (أو المكتوب مثله بالضبط) يأخذ نوعه وموظفه، إلا إذا اختارهم المستخدم بيده. */
export function expAuto(f: LiveForm, r: Sug | null): void {
  const note = f.querySelector('[data-out="cauto"]');
  if (r) {
    if (!f._cTouched) { if (f._cPrev === undefined) f._cPrev = val(f, 'c'); if (setChip(f, 'c', r.c ?? '') && note) note.textContent = '(اختاره النظام من آخر مرة)'; }
    if (!f._eTouched) { if (f._ePrev === undefined) f._ePrev = val(f, 'emp'); setChip(f, 'emp', r.emp || NO_EMP); }
    return;
  }
  if (!f._cTouched && f._cPrev !== undefined) { setChip(f, 'c', f._cPrev); f._cPrev = undefined; if (note) note.textContent = ''; }
  if (!f._eTouched && f._ePrev !== undefined) { setChip(f, 'emp', f._ePrev); f._ePrev = undefined; }
}

/** «6.25» في خانة الجرام تصير 6 | 25، كما يكتبها الدفتر. */
export function splitDot(f: HTMLFormElement): void {
  const g = inp(f, 'g'); const m = inp(f, 'm'); if (!g || !m) return;
  const x = latin(g.value).match(/^(\d*)[.٫](\d*)$/);
  if (!x) return;
  g.value = x[1] ?? ''; m.value = (x[2] ?? '').slice(0, 2);
  m.focus(); const n = m.value.length; try { m.setSelectionRange(n, n); } catch { /* ignore */ }
}

/* ---------------------------------------------------------------- سؤال التكرار */
export function showDup(f: LiveForm, o: { desc: string; no: number }): void {
  const box = f.querySelector<HTMLElement>('[data-out="dup"]'); if (!box) return;
  const e = f.querySelector<HTMLElement>('[data-out="err"]'); if (e) e.hidden = true;
  box.innerHTML = `<b>هذا السطر مطابق تمامًا للسطر ${num(o.no)} الذي قبله.</b><span>${esc(o.desc)}</span><span class="u">إذا كان مكتوبًا في الدفتر مرتين فعلًا، احفظه مرة ثانية.</span><div class="dup-acts"><button type="button" class="btn-ghost btn-sm" data-act="dupok">احفظه مرة ثانية</button><button type="button" class="btn-ghost btn-sm" data-act="dupno">لا تحفظه</button></div>`;
  box.hidden = false;
  box.querySelector<HTMLElement>('[data-act="dupno"]')?.focus();
}
export function hideDup(f: LiveForm | null): void {
  if (!f) return;
  const box = f.querySelector<HTMLElement>('[data-out="dup"]'); if (box && !box.hidden) { box.hidden = true; box.innerHTML = ''; }
  f._dupOK = false;
}
/** تفريغ نافذة السطر للسطر التالي. */
export function clearLine(f: LiveForm): void {
  ['d', 'g', 'm', 'mk', 'p', 'a', 'nn'].forEach((n) => { const i = inp(f, n); if (i) i.value = ''; });
  $$('[aria-invalid]', f).forEach((x) => x.removeAttribute('aria-invalid'));
  const e = f.querySelector<HTMLElement>('[data-out="err"]'); if (e) e.hidden = true;
  sugHide(f); hideDup(f);
  f._sugIdx = null; f._cTouched = f._eTouched = false; f._cPrev = f._ePrev = undefined;
  const cn = f.querySelector('[data-out="cauto"]'); if (cn) cn.textContent = '';
  liveUpdate(f);
  navFields(f)[0]?.focus();
}

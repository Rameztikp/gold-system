/* الحفظ: نفس شروط النموذج (readLine, saveLine, savePrices, saveDayData, saveCompare, newDay)، والخادم يتحقق مرة ثانية. */
import { hasLetter, parseNum, sameLine, describe, diffText, SEC_ONE, uuidv7, type AnyLine, type Day, type Sec, type LedgerVals } from '../../../shared/domain';
import { $$, esc, num, money, dayLong, dayShort, latin, NO_EMP } from '../util';
import { S, U, applyDay, isPending } from '../state';
import { enqueue } from '../sync';
import { api, dayCall, errorText, ApiError } from '../api';
import { render, closeModal, toast, okToast, go, toTop, modalRoot, app } from '../ui';
import { inp, val, showDup, clearLine, liveUpdate, type LiveForm } from './live';
import { lastLineNote } from './dialogs';
import { chipsHtml } from './dialogs';
import { uploadAll } from './photo-io';

export function showErr(f: HTMLFormElement, msg: string, field?: string): void {
  const e = f.querySelector<HTMLElement>('[data-out="err"]'); if (e) { e.textContent = msg; e.hidden = false; }
  $$('[aria-invalid]', f).forEach((x) => x.removeAttribute('aria-invalid'));
  const i = field ? inp(f, field) : null; if (i) { i.setAttribute('aria-invalid', 'true'); i.focus(); }
}

type Read = [Record<string, unknown>] | [null, string, string];

function readWeighed(f: HTMLFormElement, sec: 'sales' | 'purch'): Read {
  const v = (n: string): string => latin(val(f, n)).trim();
  const d = val(f, 'd').trim();
  let g = v('g'); let m = v('m');
  const gm = g.match(/^(\d*)[.٫](\d{1,2})$/); if (gm && !m) { g = gm[1] ?? ''; m = gm[2] ?? ''; }
  if (!d) return [null, 'اكتب البيان كما في الدفتر.', 'd'];
  if (!hasLetter(d)) return [null, 'البيان لازم فيه كلام، مو أرقام بس. مثل: خاتم 21.', 'd'];
  if (g && !/^\d+$/.test(g)) return [null, 'الجرام رقم صحيح بلا فواصل، مثل 7.', 'g'];
  if (m && !/^\d{1,2}$/.test(m)) return [null, 'الملي رقم أو رقمان كما في الدفتر: 3 تعني 0.30، و03 تعني 0.03.', 'm'];
  if (sec === 'purch' && !g && !m) return [null, 'اكتب الوزن: كل شراء له وزن في الدفتر.', 'g'];
  const gN = g === '' ? null : Number(g);
  if (sec === 'sales') {
    const p = parseNum(val(f, 'p')); const mk = v('mk') === '' ? null : parseNum(val(f, 'mk'));
    if (!(p > 0)) return [null, 'اكتب السعر.', 'p'];
    if (mk !== null && !(mk >= 0)) return [null, 'الأجور رقم، أو اتركها فارغة.', 'mk'];
    return [{ d, g: gN, m, k: val(f, 'k'), mk, p }];
  }
  const a = parseNum(val(f, 'a')); if (!(a > 0)) return [null, 'اكتب المبلغ.', 'a'];
  return [{ d, g: gN, m, a, t: val(f, 't') || 'كسر' }];
}

export function readLine(f: HTMLFormElement, sec: Sec): Read {
  if (sec !== 'exp') return readWeighed(f, sec);
  const d = val(f, 'd').trim(); const a = parseNum(val(f, 'a')); const nn = val(f, 'nn').trim();
  if (!d) return [null, 'اكتب البيان.', 'd'];
  if (!hasLetter(d)) return [null, 'البيان لازم فيه كلام، مو أرقام بس.', 'd'];
  if (!(a > 0)) return [null, 'اكتب المبلغ.', 'a'];
  const emp = nn || (val(f, 'emp') === NO_EMP ? '' : val(f, 'emp'));
  return [{ d, c: val(f, 'c') || 'أخرى', emp, a }];
}

/** يمنع الضغط المكرر أثناء الإرسال. */
async function busy(f: LiveForm, run: () => Promise<void>): Promise<void> {
  if (f._busy) return;
  f._busy = true;
  const btn = f.querySelector<HTMLButtonElement>('button[type=submit]'); if (btn) btn.disabled = true;
  try { await run(); } catch (e) {
    if (e instanceof ApiError && e.status === 409) await refreshDay();
    showErr(f, errorText(e));
  } finally { f._busy = false; if (btn) btn.disabled = false; }
}

async function refreshDay(): Promise<void> {
  if (!U.day) return;
  try { applyDay(await api.get<Day>(`/days/${U.day}`)); render(); } catch { /* ignore */ }
}

async function saveEdit(f: LiveForm, o: { sec: Sec; data: Record<string, unknown> }): Promise<void> {
  if (isPending(f.dataset.id ?? '')) { showErr(f, 'هذا السطر لسا ما انرسل. انتظر لين ينرسل، بعدين عدّله.'); return; }
  const day = S.days[U.day!]!; const arr = day[o.sec] as AnyLine[]; const l = arr.find((x) => x.id === f.dataset.id)!;
  const dt = diffText(o.sec, l, { ...l, ...o.data } as AnyLine);
  if (!dt) { closeModal(); toast('لم يتغير شيء'); return; }
  await dayCall('put', `/lines/${l.id}`, { line: o.data, v: l.v });
  closeModal(); U.hl = l.id; U.flash = o.sec; render();
  okToast(`حُفظ التعديل: ${esc(dt)}`);
}

function afterAdd(f: LiveForm, o: { sec: Sec; data: Record<string, unknown> }): void {
  const day = S.days[U.day!]!; const arr = day[o.sec] as AnyLine[]; const l = arr[arr.length - 1]!;
  U.hl = l.id; U.flash = o.sec; render();
  okToast(`أُضيف سطر ${SEC_ONE[o.sec]} ${num(arr.length)}: ${num(money(o.sec === 'sales' ? o.data.p : o.data.a))}`);
  // النافذة تبقى مفتوحة للسطر التالي
  const note = lastLineNote(day, o.sec); const last = f.querySelector('[data-out="last"]');
  if (last) last.innerHTML = note; else f.querySelector('.dlg-h')?.insertAdjacentHTML('afterend', `<div class="dlg-note" data-out="last">${note}</div>`);
  const tag = f.querySelector('.dlg-h .pill'); if (tag) tag.innerHTML = `${dayShort(day.id)}، السطر ${num(arr.length + 1)}`;
  if (o.sec === 'exp' && o.data.emp) {
    const box = f.querySelector('[data-chips="emp"]'); const wrap = box?.parentElement;
    if (box && wrap) { box.nextElementSibling?.remove(); box.outerHTML = chipsHtml({ name: 'emp', opts: [NO_EMP, ...S.branch.names], sel: NO_EMP, multi: false }); }
  }
  f._lineId = uuidv7();
  clearLine(f);
}

export function saveLine(f: LiveForm): void {
  const sec = f.dataset.sec as Sec; const day = S.days[U.day!]!; const arr = day[sec] as AnyLine[];
  const [data, err, field] = readLine(f, sec);
  if (!data) { showErr(f, err!, field); return; }
  if (sec === 'exp' && data.emp && !S.branch.names.includes(String(data.emp))) S.branch.names.push(String(data.emp));
  if (f.dataset.id) { void busy(f, () => saveEdit(f, { sec, data })); return; }
  const prev = arr[arr.length - 1];
  if (!f._dupOK && prev && !prev.x && sameLine(sec, prev, { id: '', ...data } as AnyLine)) { showDup(f, { desc: describe(sec, prev), no: arr.length }); return; }
  // المعرّف ثابت للسطر حتى يُحفظ، فإعادة المحاولة بعد انقطاع النت ما تكرّره
  const id = f._lineId ?? (f._lineId = uuidv7());
  // يظهر على طول وينرسل بالخلفية؛ لو النت مقطوع ينتظر وينرسل لحاله (D-32)
  enqueue({ id, day: day.id, sec, line: data });
  applyDay(day);
  afterAdd(f, { sec, data });
}

export function savePrices(f: LiveForm): void {
  const d = S.days[U.day!]!; const buy = parseNum(val(f, 'buy')); const sell = val(f, 'sell').trim() === '' ? null : parseNum(val(f, 'sell'));
  if (!(buy > 0)) { showErr(f, 'اكتب سعر الشراء من عمود «سعر الذهب» في صفحة المبيعات.', 'buy'); return; }
  if (sell !== null && !(sell > 0)) { showErr(f, 'سعر البيع رقم، أو اتركه فارغًا.', 'sell'); return; }
  if (buy === d.buy && sell === d.sell) { closeModal(); toast('لم يتغير شيء'); return; }
  void busy(f, async () => {
    await dayCall('put', `/days/${d.id}/prices`, { buy, sell, v: d.v });
    closeModal(); render(); okToast('حُفظ التعديل');
  });
}

export function saveDayData(f: LiveForm): void {
  const d = S.days[U.day!]!;
  const comm = val(f, 'comm').trim() === '' ? null : parseNum(val(f, 'comm')); const x = val(f, 'x').trim() === '' ? null : parseNum(val(f, 'x'));
  if (comm !== null && !(comm >= 0)) { showErr(f, 'العمولة رقم، أو اتركها فارغة.', 'comm'); return; }
  if (x !== null && !(x >= 0)) { showErr(f, 'مبلغ البند الإضافي رقم، أو اتركه فارغًا.', 'x'); return; }
  const xl = val(f, 'xl').trim();
  const commNew = d.comm === null && comm !== null;
  const changed = d.comm !== comm || d.x !== x || d.xl !== xl;
  void busy(f, async () => {
    if (changed) await dayCall('put', `/days/${d.id}/daydata`, { comm, xl, x, v: d.v });
    closeModal(); render(); toast(`${commNew ? 'أُضيفت العمولة' : changed ? 'حُفظ التعديل' : 'لم يتغير شيء'}`);
  });
}

export function saveCompare(f: LiveForm, lerr: boolean): void {
  liveUpdate(f);
  const d = S.days[U.day!]!; const ledger: LedgerVals = {};
  for (const k of ['sales', 'sw', 'mk', 'tot', 'purch', 'pw'] as const) { const v = parseNum(val(f, k)); if (!isNaN(v)) ledger[k] = v; }
  void busy(f, async () => {
    await dayCall('post', `/days/${d.id}/compare`, { ledger, lerr, v: d.v });
    toast(lerr ? 'حُفظ اليوم مع ملاحظة يراها صاحب المحل' : 'اليوم مطابق للدفتر');
    toTop(); render();
  });
}

export function newDay(f: LiveForm): void {
  const id = val(f, 'date'); const buy = parseNum(val(f, 'buy')); const sell = val(f, 'sell').trim() === '' ? null : parseNum(val(f, 'sell'));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) { showErr(f, 'اختر التاريخ.', 'date'); return; }
  if (S.days[id]) { showErr(f, `${dayLong(id)} مفتوح من قبل. اختر تاريخًا آخر.`, 'date'); return; }
  if (!(buy > 0)) { showErr(f, 'اكتب سعر الشراء من عمود «سعر الذهب» في صفحة المبيعات.', 'buy'); return; }
  if (sell !== null && !(sell > 0)) { showErr(f, 'سعر البيع رقم، أو اتركه فارغًا.', 'sell'); return; }
  const photos = f._photos ?? [];
  void busy(f, async () => {
    await dayCall('post', '/days', { date: id, buy, sell });
    if (photos.length) await uploadAll(id, photos);
    U.dm = null;
    // أول يوم في النظام: اللوحة والتقارير تنتقل لشهره بدل الشهر الفاضي
    if (Object.keys(S.days).length === 1) { U.period = null; U.rperiod = null; }
    // على الكمبيوتر صفحة المبيعات تنفتح جنب الإدخال مباشرة
    if (photos.length && app.clientWidth > 820) U.pv = { day: id };
    go('entry', { day: id, step: 'sales' });
    okToast(`فُتح ${esc(dayLong(id))}. ابدأ بسطور المبيعات.`);
    setTimeout(() => openLineDialog('sales'), 250);
  });
}

let openLineDialog: (sec: Sec) => void = () => undefined;
export const setLineOpener = (fn: (sec: Sec) => void): void => { openLineDialog = fn; };

export async function cancelLine(f: LiveForm, reason: string): Promise<void> {
  const sec = f.dataset.sec as Sec; const day = S.days[U.day!]!; const l = (day[sec] as AnyLine[]).find((x) => x.id === f.dataset.id)!;
  try {
    await dayCall('post', `/lines/${l.id}/cancel`, { r: reason, v: l.v });
    closeModal(); U.hl = l.id; U.flash = sec; render(); okToast('أُلغي السطر، ويبقى ظاهرًا في القائمة');
  } catch (e) { showErr(f, errorText(e)); }
}

export async function restoreLine(f: LiveForm): Promise<void> {
  const sec = f.dataset.sec as Sec; const day = S.days[U.day!]!; const l = (day[sec] as AnyLine[]).find((x) => x.id === f.dataset.id)!;
  try {
    await dayCall('post', `/lines/${l.id}/restore`, { v: l.v });
    closeModal(); U.hl = l.id; render(); okToast('رجع السطر إلى الحساب');
  } catch (e) { showErr(f, errorText(e)); }
}

export const modalForm = (): LiveForm | null => modalRoot.querySelector<LiveForm>('form');

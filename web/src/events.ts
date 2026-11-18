/* الأحداث (ACTS والمستمعون في النموذج) — مربوطة بالخادم. */
import type { AnyLine, PhotoLabel, Sec } from '../../shared/domain';
import { normS } from '../../shared/domain';
import { $, $$, esc, KARATS } from './util';
import { ico } from './icons';
import { S, U, lastDay, type Route, type Step } from './state';
import { api, dayCall, errorText } from './api';
import { render, go, toTop, openModal, closeModal, toast, okToast, setTheme, accountSheet, adminSheet, focusSearch, app, screen, modalRoot } from './ui';
import { dayWaDialog, reportWaDialog, waNorm, waFmt } from './views/wa';
import { empDialog, alertDialog } from './views/dash';
import { pkey, setKind, movePeriod } from './views/period';
import { moveMonth } from './views/days';
import { lineDialog, dayDataDialog, newDayDialog, pricesDialog } from './views/dialogs';
import { liveUpdate, sugPick, hideDup, clearLine, sugShow, sugHide, sugMove, sugIdx, expAuto, splitDot, navFields, inp, type LiveForm } from './views/live';
import { saveLine, savePrices, saveDayData, saveCompare, newDay, cancelLine, restoreLine, modalForm, setLineOpener } from './views/save';
import { syncViewer, photosDialog, zoomBy } from './views/viewer';
import { addFiles, ndPhotosRender } from './views/photo-io';
import { searchResults } from './views/search';
import { resetAdminCache } from './views/admin';
import { L } from './views/login';
import * as auth from './auth';
import { filterField } from './fields';
import { unlockWithKey, cancelUnlock, unlockWithPassword } from './lock';

type Act = (el: HTMLElement) => void;

export function openLine(sec: Sec, id?: string): void {
  const day = S.days[U.day!]!; const l = id ? (day[sec] as AnyLine[]).find((x) => x.id === id) ?? null : null;
  openModal(lineDialog(sec, l)); liveUpdate(modalForm());
}
setLineOpener((sec) => openLine(sec));

const NAV: Record<string, Act> = {
  go: (el) => { if (el.dataset.r === 'log' || el.dataset.r === 'users') resetAdminCache(); go(el.dataset.r as Route); },
  account: () => openModal(accountSheet()),
  adminsheet: () => openModal(adminSheet()),
  logout: () => { void auth.logout(); },
  theme: (el) => { setTheme(el.dataset.v ?? 'dark'); const open = modalRoot.innerHTML; render(); if (open) openModal(accountSheet()); },
  openday: (el) => go('entry', { day: el.dataset.id ?? null, step: 'sales' }),
  opencheck: (el) => go('entry', { day: el.dataset.id ?? null, step: 'check' }),
  dayto: (el) => { if (!el.dataset.id) return; U.day = el.dataset.id; if (el.dataset.s) { U.step = el.dataset.s as Step; toTop(); } closeModal(); render(); },
  step: (el) => { U.step = el.dataset.s as Step; if (el.dataset.top) toTop(); render(); },
  dmove: (el) => { moveMonth(Number(el.dataset.d)); render(); },
  dlast: () => { U.dm = null; render(); },
  close: () => closeModal(),
};

const ENTRY: Record<string, Act> = {
  'add-sales': () => openLine('sales'), 'add-purch': () => openLine('purch'), 'add-exp': () => openLine('exp'),
  line: (el) => openLine(el.dataset.sec as Sec, el.dataset.id),
  daydata: () => { openModal(dayDataDialog()); liveUpdate(modalForm()); },
  newday: () => openModal(newDayDialog()),
  prices: (el) => { openModal(pricesDialog(el.dataset.f)); setTimeout(() => modalRoot.querySelector<HTMLInputElement>('[autofocus]')?.select(), 60); },
  cmpok: (el) => saveCompare(el.closest('form') as LiveForm, false),
  cmplerr: (el) => saveCompare(el.closest('form') as LiveForm, true),
  chip: (el) => chipClick(el),
  xask: (el) => {
    const z = el.closest('[data-x-zone]')!;
    z.innerHTML = '<label class="lb" for="x-r" style="width:100%;margin:0">سبب الإلغاء</label><input class="in" id="x-r" name="xr" placeholder="مثل: سطر مكرر" style="flex:1 1 220px;height:44px;font-size:15px"><button type="button" class="btn-danger" data-act="xdo">أكّد الإلغاء</button>';
    z.querySelector<HTMLInputElement>('input')?.focus();
  },
  xdo: () => xdo(),
  unx: () => { const f = modalForm(); if (f) void restoreLine(f); },
  sug: (el) => sugPick(el.closest('form') as LiveForm, Number(el.dataset.i)),
  dupok: (el) => { const f = el.closest('form') as LiveForm; f._dupOK = true; saveLine(f); },
  dupno: (el) => { clearLine(el.closest('form') as LiveForm); toast('لم يُحفظ السطر المكرر.'); },
};

function chipClick(el: HTMLElement): void {
  const box = el.closest<HTMLElement>('[data-chips]')!; const multi = box.dataset.multi === '1'; const hid = box.nextElementSibling as HTMLInputElement;
  if (multi) el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true'));
  else $$('.chip', box).forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
  const sel = $$<HTMLElement>('.chip[aria-pressed="true"]', box).map((b) => b.dataset.v ?? '');
  hid.value = multi ? KARATS.filter((k) => sel.includes(k)).join(' + ') : (sel[0] ?? '');
  const f = el.closest<LiveForm>('form'); if (!f) return;
  const nn = inp(f, 'nn'); if (nn && box.dataset.chips === 'emp') nn.value = '';
  // النوع أو الموظف المختار باليد ما تغيّره الاقتراحات
  if (box.dataset.chips === 'c') { f._cTouched = true; const n = f.querySelector('[data-out="cauto"]'); if (n) n.textContent = ''; }
  if (box.dataset.chips === 'emp') f._eTouched = true;
  hideDup(f);
}

function xdo(): void {
  const f = modalForm(); const x = f ? inp(f, 'xr') : null; if (!f || !x) return;
  const r = x.value.trim();
  if (!r) { x.setAttribute('aria-invalid', 'true'); x.focus(); return; }
  void cancelLine(f, r);
}

const DASH: Record<string, Act> = {
  dtab: (el) => {
    U.dtab = el.dataset.k ?? 'sales'; render();
    $<HTMLElement>('#tile-' + U.dtab)?.focus({ preventScroll: true });
    const pnl = $('#dpanel'); if (pnl && app.clientWidth <= 820) pnl.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  },
  emp: (el) => openModal(empDialog(el.dataset.n ?? '')),
  alist: (el) => openModal(alertDialog(el.dataset.k as 'lerr' | 'open')),
  pkind: (el) => { setKind(pkey(el.dataset.p), el.dataset.k as 'day'); render(); },
  pmove: (el) => { movePeriod(pkey(el.dataset.p), Number(el.dataset.d)); render(); },
  plast: (el) => { U[pkey(el.dataset.p)] = { kind: 'month', anchor: lastDay() }; render(); },
  pday: (el) => { U.period = { kind: 'day', anchor: el.dataset.id! }; document.getElementById('tip')!.hidden = true; render(); },
  tview: () => { U.tview = !U.tview; render(); },
  rkind: (el) => { U.rkind = el.dataset.k ?? 'sum'; render(); },
  print: () => window.print(),
  repwa: () => openModal(reportWaDialog()),
  wa: (el) => openModal(dayWaDialog(el.dataset.id ?? U.day!, el.dataset.to === 'owner')),
  waopen: () => toast(`${ico('send', 16)} يُفتح الواتساب في صفحة جديدة والرسالة جاهزة فيه. إذا لم يُفتح، انسخ الرسالة وألصقها.`),
  wacopy: () => copyText(modalRoot.querySelector<HTMLTextAreaElement>('.wa-src')?.value ?? ''),
};

function copyText(text: string): void {
  const done = (ok: boolean): void => toast(ok ? `${ico('check', 16)} نُسخت الرسالة. ألصقها في الواتساب.` : 'تعذّر النسخ التلقائي: حدّد نص الرسالة وانسخه.');
  navigator.clipboard.writeText(text).then(() => done(true), () => done(false));
}

const SEARCH: Record<string, Act> = {
  qsec: (el) => { U.qs = el.dataset.k ?? 'all'; render(); },
  qpkind: (el) => {
    if (el.dataset.k === 'all') { U.qperiod = null; render(); return; }
    if (!U.qperiod) U.qperiod = { kind: 'month', anchor: lastDay() };
    DASH.pkind!(el);
  },
  qex: (el) => { U.q = el.dataset.v ?? ''; render(); focusSearch(); },
  qall: () => { U.qperiod = null; U.qs = 'all'; render(); focusSearch(); },
  sres: (el) => go('entry', { day: el.dataset.id ?? null, step: el.dataset.sec as Step, hl: el.dataset.l ?? null, fromSearch: true }),
  sday: (el) => go('entry', { day: el.dataset.id ?? null, step: 'sales', fromSearch: true }),
};

const PHOTOS: Record<string, Act> = {
  pvtoggle: (el) => { const id = el.dataset.id ?? U.day!; U.pv = U.pv && U.pv.day === id ? null : { day: id }; render(); },
  pvclose: () => { U.pv = null; render(); },
  pvtab: (el) => { if (U.pv) { U.pv.sel = el.dataset.v ?? null; if (U.route === 'days') render(); else syncViewer(); } },
  pvzoom: (el) => zoomBy(el.dataset.z ?? 'fit'),
  pvshow: (el) => { U.pv = { day: el.dataset.id!, sel: el.dataset.v ?? null, step: U.route === 'entry' ? U.step : null }; closeModal(); render(); },
  photos: (el) => openModal(photosDialog(el.dataset.id ?? U.pv?.day ?? U.day!)),
  phlabel: (el) => {
    dayCall('put', `/photos/${el.dataset.pid}/label`, { label: el.dataset.v as PhotoLabel })
      .then(() => { openModal(photosDialog(el.dataset.id!)); syncViewer(true); }).catch((e: unknown) => toast(errorText(e)));
  },
  phdelask: (el) => {
    const z = modalRoot.querySelector(`[data-phx="${el.dataset.pid}"]`)!;
    z.innerHTML = `<span class="u">متأكد؟</span><button type="button" class="btn-danger" data-act="phdel" data-id="${el.dataset.id}" data-pid="${el.dataset.pid}">نعم، أزلها</button><button type="button" class="btn-ghost btn-sm" data-act="phdelno" data-id="${el.dataset.id}">لا</button>`;
  },
  phdelno: (el) => openModal(photosDialog(el.dataset.id!)),
  phdel: (el) => {
    dayCall('post', `/photos/${el.dataset.pid}/remove`, {})
      .then(() => { openModal(photosDialog(el.dataset.id!)); render(); okToast('أُزيلت الصورة، وسُجّل ذلك في السجل'); }).catch((e: unknown) => toast(errorText(e)));
  },
  ndphlabel: (el) => { const f = el.closest('form') as LiveForm; const p = (f._photos ?? [])[Number(el.dataset.i)]; if (p) { p.label = el.dataset.v as PhotoLabel; ndPhotosRender(f); } },
  ndphdel: (el) => { const f = el.closest('form') as LiveForm; (f._photos ?? []).splice(Number(el.dataset.i), 1); ndPhotosRender(f); },
};

const ADMIN: Record<string, Act> = {
  logf: (el) => { U.logf = el.dataset.k ?? 'all'; resetAdminCache(); render(); },
  ws: (el) => {
    api.put<typeof S.branch>('/admin/settings/week-start', { weekStart: Number(el.dataset.v) })
      .then((b) => { S.branch = b; render(); okToast(`بداية الأسبوع: ${esc(el.textContent ?? '')}`); }).catch((e: unknown) => toast(errorText(e)));
  },
  usertoggle: (el) => auth.toggleUser(el.dataset.id!),
  userpw: (el) => openModal(auth.passwordDialog(el.dataset.id!)),
  adduser: () => openModal(auth.addUserDialog()),
  addkey: () => auth.addPasskey(),
  codes: () => auth.newCodes(),
  copycodes: () => auth.copyCodes(modalRoot.querySelector<HTMLTextAreaElement>('.codes-src')?.value ?? ''),
  pick: (el) => { L.pick = el.dataset.v === 'clerk' ? 'clerk' : 'owner'; L.err = ''; render(); },
  passkey: () => auth.passkeyLogin(),
  enter: () => auth.enterAfterSetup(),
  unlockkey: () => unlockWithKey(),
  unlockcancel: () => cancelUnlock(),
  unlockrec: () => { void auth.logout({ recovery: true }); },
};

const ACTS: Record<string, Act> = { ...NAV, ...ENTRY, ...DASH, ...SEARCH, ...PHOTOS, ...ADMIN };

const SUBMIT: Record<string, (f: LiveForm, e: SubmitEvent) => void> = {
  login: (f, e) => auth.submitLogin(f, (e.submitter as HTMLElement | null)?.dataset.v ?? (L.pick === 'owner' ? 'recovery' : 'password')),
  setup: (f) => auth.submitSetup(f),
  unlock: (f) => unlockWithPassword(f),
  adduser: (f) => auth.submitAddUser(f),
  userpw: (f) => auth.submitUserPw(f),
  line: (f) => saveLine(f),
  daydata: (f) => saveDayData(f),
  prices: (f) => savePrices(f),
  newday: (f) => newDay(f),
  wanum: (f) => saveWa(f),
  addname: (f) => addToList(f, { field: 'nm', path: '/admin/settings/names', ok: 'أُضيف الاسم' }),
  addcat: (f) => addToList(f, { field: 'cat', path: '/admin/settings/cats', ok: 'أُضيف النوع' }),
};

function saveWa(f: LiveForm): void {
  const raw = inp(f, 'wa'); const v = (raw?.value ?? '').trim(); const n = v ? waNorm(v) : '';
  if (v && (n.length < 9 || n.length > 15)) { raw?.setAttribute('aria-invalid', 'true'); raw?.focus(); toast('اكتب رقمًا صحيحًا، مثل 0501234567'); return; }
  api.put<typeof S.branch>('/admin/settings/wa', { wa: n }).then((b) => { S.branch = b; render(); okToast(n ? `حُفظ رقم صاحب المحل: ${waFmt(n)}` : 'مُسح الرقم'); })
    .catch((e: unknown) => toast(errorText(e)));
}

function addToList(f: LiveForm, o: { field: string; path: string; ok: string }): void {
  const n = (inp(f, o.field)?.value ?? '').trim(); if (!n) return;
  api.post<typeof S.branch>(o.path, { name: n }).then((b) => { S.branch = b; render(); okToast(`${o.ok} ${esc(n)}`); }).catch((e: unknown) => toast(errorText(e)));
}

function onInput(e: Event): void {
  const t = e.target as HTMLInputElement; const f = t.form as LiveForm | null;
  if (t instanceof HTMLInputElement && !(e as InputEvent).isComposing) filterField(t);
  if (t.id === 'q') { U.q = t.value; const sr = $('#sr', screen); if (sr) sr.innerHTML = searchResults(); return; }
  if (f && f.dataset.form === 'line') {
    if (t.name === 'g') splitDot(f);
    if (t.name === 'd') {
      sugShow(f);
      if (f.dataset.sec === 'exp') { const qn = normS(t.value); expAuto(f, qn ? sugIdx(f).find((r) => r.k === qn) ?? null : null); }
    }
    if (t.name === 'nn' && t.value.trim()) { f._eTouched = true; $$('[data-chips="emp"] .chip', f).forEach((b) => b.setAttribute('aria-pressed', 'false')); }
    hideDup(f);
  }
  if (f && ['line', 'daydata', 'compare', 'newday'].includes(f.dataset.form ?? '')) liveUpdate(f);
}

/** القائمة المقترحة: الأسهم تتحرك، Enter يختار، Esc يغلقها فقط. */
function sugKeys(e: KeyboardEvent, f: LiveForm): boolean {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!(f._sug && f._sug.length)) sugShow(f);
    if (f._sug && f._sug.length) { e.preventDefault(); sugMove(f, e.key === 'ArrowDown' ? 1 : -1); }
    return true;
  }
  if (f._sug && f._sug.length && e.key === 'Escape') { e.preventDefault(); sugHide(f); return true; }
  if (f._sug && f._sug.length && e.key === 'Enter' && (f._sugI ?? -1) >= 0) { e.preventDefault(); sugPick(f, f._sugI!); return true; }
  return false;
}

/** Enter ينقل للخانة التالية؛ وفي آخر خانة يحفظ. Esc يغلق النافذة. */
function onKey(e: KeyboardEvent): void {
  const t = e.target as HTMLInputElement; const f = (t.form ?? null) as LiveForm | null;
  if (f && f.dataset.form === 'line' && t.name === 'd' && !e.isComposing && sugKeys(e, f)) return;
  if (e.key === 'Escape' && modalRoot.innerHTML) { e.preventDefault(); closeModal(); return; }
  if (e.key === 'Escape' && U.pv && app.clientWidth <= 820) { e.preventDefault(); U.pv = null; render(); return; }
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing || !f || !f.dataset.form || t.tagName !== 'INPUT') return;
  if (t.name === 'xr') { e.preventDefault(); xdo(); return; }
  if (!['line', 'newday', 'daydata', 'compare', 'prices'].includes(f.dataset.form) || t.dataset.skip) return;
  const fields = navFields(f); const i = fields.indexOf(t);
  if (i > -1 && i < fields.length - 1) { e.preventDefault(); fields[i + 1]!.focus(); fields[i + 1]!.select(); return; }
  if (f.dataset.form === 'compare') { e.preventDefault(); liveUpdate(f); if (f._filled && !(f._bad ?? []).length && S.days[U.day!]!.status !== 'ok') saveCompare(f, false); }
}

function onTip(e: PointerEvent | FocusEvent): void {
  const tip = document.getElementById('tip')!;
  const el = (e.target as Element | null)?.closest?.<HTMLElement>('[data-tip]');
  if (!el) { tip.hidden = true; return; }
  tip.textContent = el.getAttribute('data-tip'); tip.hidden = false;
  const r0 = el.getBoundingClientRect();
  const x = 'clientX' in e ? e.clientX : r0.left + r0.width / 2; const y = 'clientY' in e ? e.clientY : r0.bottom;
  const r = tip.getBoundingClientRect(); let left = x + 14; let top = y + 14;
  if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
  if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
  tip.style.left = Math.max(8, left) + 'px'; tip.style.top = Math.max(8, top) + 'px';
}

function onDrop(e: DragEvent): void {
  const z = (e.target as Element | null)?.closest?.<HTMLElement>('[data-drop]'); if (!z) return;
  e.preventDefault(); z.classList.remove('over'); void addFiles(e.dataTransfer?.files, z.dataset.drop!);
}

export function wireEvents(): void {
  document.addEventListener('click', (e) => { const el = (e.target as Element).closest<HTMLElement>('[data-act]'); const fn = el ? ACTS[el.dataset.act!] : undefined; if (el && fn) fn(el); });
  document.addEventListener('submit', (e) => { const f = e.target as LiveForm; const fn = SUBMIT[f.dataset?.form ?? '']; if (!fn) return; e.preventDefault(); fn(f, e as SubmitEvent); });
  document.addEventListener('input', onInput);
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointermove', onTip);
  document.addEventListener('focusin', onTip);
  document.addEventListener('focusout', (e) => {
    const t = e.target as HTMLInputElement; const f = t.form as LiveForm | null;
    if (f && f.dataset.form === 'line' && t.name === 'd') setTimeout(() => { if (document.activeElement !== t) sugHide(f); }, 150);
  });
  // يبقى التركيز في خانة الكتابة وقت الضغط على اقتراح
  document.addEventListener('mousedown', (e) => { if ((e.target as Element).closest?.('.sug')) e.preventDefault(); });
  document.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.photoIn) { void addFiles(t.files, t.dataset.photoIn); t.value = ''; return; }
    const a = t.dataset.actChange; if (!a || !/^\d{4}-\d{2}-\d{2}$/.test(t.value)) return;
    const P = U[pkey(t.dataset.p)]; if (P) { P[a as 'from' | 'to'] = t.value; render(); }
  });
  document.addEventListener('dragover', (e) => { const z = (e.target as Element).closest?.('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('over'); } });
  document.addEventListener('dragleave', (e) => { const z = (e.target as Element).closest?.('[data-drop]'); if (z && !z.contains(e.relatedTarget as Node)) z.classList.remove('over'); });
  document.addEventListener('drop', onDrop);
}


/* صور الدفتر: لوحة بجانب الإدخال على الكمبيوتر، وتملأ الشاشة على الجوال (syncViewer, viewerHtml, photosDialog). */
import type { Photo, PhotoLabel } from '../../../shared/domain';
import { esc, dayShort, PH_LABELS } from '../util';
import { ico } from '../icons';
import { S, U, STEPS, type Step } from '../state';
import { dlgHead } from '../ui';

const pvRoot = document.getElementById('pv-root')!;
const app = document.getElementById('app')!;
const PV: { key: string | null; z: number; drag: { id: number; x: number; y: number; sl: number; st: number } | null; pinch: { d: number; z: number } | null } = { key: null, z: 1, drag: null, pinch: null };

export const photosOf = (id: string): Photo[] => S.days[id]?.photos ?? [];
export const photoUrl = (p: Photo): string => `/api/photos/${p.id}`;

/** «صفحة أخرى 1»، «صفحة أخرى 2» إذا صورتين بنفس التسمية. */
export function photoNames(list: readonly { id: string; label: PhotoLabel }[]): Record<string, string> {
  const seen: Record<string, number> = {}; const total: Record<string, number> = {}; const out: Record<string, string> = {};
  list.forEach((p) => { total[p.label] = (total[p.label] ?? 0) + 1; });
  list.forEach((p) => { seen[p.label] = (seen[p.label] ?? 0) + 1; out[p.id] = PH_LABELS[p.label] + ((total[p.label] ?? 0) > 1 ? ` ${seen[p.label]}` : ''); });
  return out;
}

function pvAuto(photos: Photo[], step: Step): string | null {
  if (!photos.length) return null;
  if (step === 'check' && photos.length > 1) return 'all';
  const want = step === 'sales' ? 'sales' : 'cash';
  return (photos.find((p) => p.label === want) ?? photos[0]!).id;
}

export function syncViewer(force?: boolean): void {
  if (!U.user || !U.pv) { if (pvRoot.innerHTML) pvRoot.innerHTML = ''; app.classList.remove('pv-open'); PV.key = null; return; }
  if (U.route === 'entry' && U.day && S.days[U.day]) U.pv.day = U.day;
  const id = U.pv.day; const photos = photosOf(id);
  const step = U.route === 'entry' ? (STEPS.some((s) => s[0] === U.step) ? U.step : 'sales') : null;
  if (step && U.pv.step !== step) { U.pv.step = step; U.pv.sel = pvAuto(photos, step); }
  if (U.pv.sel === 'all' ? photos.length < 2 : !photos.some((p) => p.id === U.pv!.sel)) U.pv.sel = pvAuto(photos, step ?? 'sales');
  app.classList.add('pv-open');
  const key = [id, U.pv.sel, photos.map((p) => `${p.id}:${p.label}`).join(',')].join('|');
  if (!force && key === PV.key) return;
  const same = PV.key && PV.key.split('|').slice(0, 2).join('|') === `${id}|${U.pv.sel}`;
  PV.key = key; if (!same) PV.z = 1;
  pvRoot.innerHTML = viewerHtml(id, photos, U.pv.sel ?? null);
  const st = pvRoot.querySelector<HTMLElement>('.pv-stage'); if (st) st.style.setProperty('--z', String(PV.z));
}

function viewerHtml(id: string, photos: Photo[], sel: string | null): string {
  const names = photoNames(photos);
  const tabs = photos.length > 1 ? `<div class="pv-tabs" role="tablist" aria-label="الصفحة">${photos.map((p) => `<button type="button" role="tab" data-act="pvtab" data-v="${p.id}" aria-selected="${sel === p.id}">${names[p.id]}</button>`).join('')}<button type="button" role="tab" data-act="pvtab" data-v="all" aria-selected="${sel === 'all'}">${photos.length === 2 ? 'الصفحتان' : 'كل الصفحات'}</button></div>` : '';
  const shown = sel === 'all' ? photos : photos.filter((p) => p.id === sel);
  const body = photos.length
    ? `<div class="pv-stage" tabindex="0" aria-label="صورة الدفتر. اسحبها لتحريكها.">${shown.map((p) => `<img src="${esc(photoUrl(p))}" data-pid="${p.id}" alt="${esc(names[p.id])}" draggable="false">`).join('')}</div>
      <div class="pv-tools"><button type="button" class="icon-btn" data-act="pvzoom" data-z="in" aria-label="تكبير" title="تكبير">${ico('plus', 16)}</button><button type="button" class="icon-btn" data-act="pvzoom" data-z="out" aria-label="تصغير" title="تصغير">${ico('minus', 16)}</button><button type="button" class="btn-text" data-act="pvzoom" data-z="fit">ملء العرض</button><span class="u pv-hint">اسحب الصورة لتحريكها</span><button type="button" class="btn-text" data-act="photos" data-id="${id}">إدارة الصور</button></div>`
    : `<div class="pv-empty"><p>لا توجد صور لهذا اليوم.</p><button type="button" class="btn-gold btn-sm" data-act="photos" data-id="${id}">${ico('plus', 16)} أضف صور الدفتر</button></div>`;
  return `<aside class="pviewer" aria-label="صور الدفتر">
    <div class="pv-h"><div class="pv-t"><b>صور الدفتر</b><span class="u">${S.days[id] ? dayShort(id) : ''}</span></div><button type="button" class="icon-btn" data-act="pvclose" aria-label="إغلاق الصور" title="إغلاق">${ico('x', 16)}</button></div>
    ${tabs}${body}
  </aside>`;
}

interface Pt { x: number; y: number }
export function pvZoom(z: number, at?: Pt): void {
  const st = pvRoot.querySelector<HTMLElement>('.pv-stage'); if (!st) return;
  z = Math.min(4, Math.max(1, z));
  const k = z / PV.z; if (Math.abs(k - 1) < 0.001) return;
  const px = at ? at.x : st.clientWidth / 2; const py = at ? at.y : st.clientHeight / 2;
  const sx = st.scrollLeft + px; const sy = st.scrollTop + py;
  PV.z = z; st.style.setProperty('--z', String(z));
  st.scrollLeft = sx * k - px; st.scrollTop = sy * k - py;
}
export const zoomBy = (kind: string): void => pvZoom(kind === 'fit' ? 1 : kind === 'in' ? PV.z * 1.5 : PV.z / 1.5);

const PTR = new Map<number, Pt>();
const stageOf = (e: Event): HTMLElement | null => (e.target as Element | null)?.closest?.<HTMLElement>('.pv-stage') ?? null;
const rel = (st: HTMLElement, p: Pt): Pt => { const r = st.getBoundingClientRect(); return { x: p.x - r.left, y: p.y - r.top }; };

function onDown(e: PointerEvent): void {
  const st = stageOf(e); if (!st || (e.pointerType === 'mouse' && e.button !== 0)) return;
  PTR.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { st.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  if (PTR.size === 1) { PV.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sl: st.scrollLeft, st: st.scrollTop }; st.classList.add('drag'); }
  if (PTR.size === 2) { const [a, b] = [...PTR.values()] as [Pt, Pt]; PV.drag = null; PV.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: PV.z }; }
}
function onMove(e: PointerEvent): void {
  if (!PTR.has(e.pointerId)) return;
  const st = pvRoot.querySelector<HTMLElement>('.pv-stage'); if (!st) return;
  PTR.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (PV.pinch && PTR.size === 2) {
    const [a, b] = [...PTR.values()] as [Pt, Pt];
    pvZoom(PV.pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / PV.pinch.d, rel(st, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }));
  } else if (PV.drag && PV.drag.id === e.pointerId) {
    st.scrollLeft = PV.drag.sl - (e.clientX - PV.drag.x); st.scrollTop = PV.drag.st - (e.clientY - PV.drag.y);
  }
}
function onEnd(e: PointerEvent): void {
  PTR.delete(e.pointerId);
  const st = pvRoot.querySelector<HTMLElement>('.pv-stage');
  if (PTR.size < 2) PV.pinch = null;
  if (PTR.size === 1 && st) { const [[pid, q]] = [...PTR.entries()] as [[number, Pt]]; PV.drag = { id: pid, x: q.x, y: q.y, sl: st.scrollLeft, st: st.scrollTop }; }
  else if (!PTR.size) { PV.drag = null; if (st) st.classList.remove('drag'); }
}

/** التكبير بالأزرار، أو Ctrl مع عجلة الفأرة، أو نقرتين، أو إصبعين؛ والسحب للتحريك. */
export function wireViewer(): void {
  pvRoot.addEventListener('wheel', (e) => {
    const st = stageOf(e); if (!st || !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault(); pvZoom(PV.z * Math.exp(-e.deltaY * 0.0025), rel(st, { x: e.clientX, y: e.clientY }));
  }, { passive: false });
  pvRoot.addEventListener('dblclick', (e) => { const st = stageOf(e); if (st) pvZoom(PV.z > 1.2 ? 1 : 2.5, rel(st, { x: e.clientX, y: e.clientY })); });
  pvRoot.addEventListener('pointerdown', onDown);
  pvRoot.addEventListener('pointermove', onMove);
  pvRoot.addEventListener('pointerup', onEnd);
  pvRoot.addEventListener('pointercancel', onEnd);
}

export function photosDialog(id: string): string {
  const photos = photosOf(id); const names = photoNames(photos);
  const cards = photos.map((p) => `<figure class="ph-c">
      <button type="button" class="ph-th" data-act="pvshow" data-id="${id}" data-v="${p.id}" aria-label="اعرض ${esc(names[p.id])}"><img src="${esc(photoUrl(p))}" alt="" draggable="false"></button>
      <div class="chips ph-lb" role="group" aria-label="أي صفحة؟">${Object.entries(PH_LABELS).map(([k, l]) => `<button type="button" class="chip" data-act="phlabel" data-id="${id}" data-pid="${p.id}" data-v="${k}" aria-pressed="${p.label === k}">${l}</button>`).join('')}</div>
      <div class="ph-x" data-phx="${p.id}"><button type="button" class="btn-danger" data-act="phdelask" data-id="${id}" data-pid="${p.id}">أزل الصورة</button></div>
    </figure>`).join('');
  return `<div class="dialog wide" role="dialog" aria-modal="true" aria-labelledby="dlg-t" data-photos="${id}">
    ${dlgHead('صور الدفتر', dayShort(id))}
    <div class="dlg-note">صور صفحات الدفتر لهذا اليوم. اختر لكل صورة أي صفحة هي. الإضافة والإزالة تُسجَّلان في سجل التعديلات.</div>
    <div class="ph-grid">${cards}
      <label class="ph-add" data-drop="${id}">${ico('image', 26)}<b>أضف صورًا</b><span class="u">اختر من جهازك، أو اسحبها هنا</span><input type="file" accept="image/*" multiple data-photo-in="${id}" hidden></label>
    </div>
  </div>`;
}

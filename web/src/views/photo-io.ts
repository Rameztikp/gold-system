/* صور الدفتر من الجهاز: تصغير ثم رفع (fileToJpeg, addFiles, ndPhotosRender). */
import { uuidv7, type PhotoLabel } from '../../../shared/domain';
import { esc, num, dayMid, PH_LABELS } from '../util';
import { ico } from '../icons';
import { S } from '../state';
import { dayCall, errorText } from '../api';
import { openModal, render, toast, okToast, modalRoot } from '../ui';
import { photosDialog } from './viewer';
import type { LiveForm } from './live';

/** صورة الجوال تُصغَّر قبل الحفظ: أطول ضلع 1600 بكسل، JPEG بجودة 0.82. إعادة الرسم تحذف بيانات الموقع (GPS). */
async function fileToJpeg(file: File): Promise<{ blob: Blob; data: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.82));
    return { blob, data: c.toDataURL('image/jpeg', 0.82) };
  } finally { URL.revokeObjectURL(url); }
}

const nextLabel = (list: readonly { label: PhotoLabel }[]): PhotoLabel =>
  (!list.some((p) => p.label === 'sales') ? 'sales' : !list.some((p) => p.label === 'cash') ? 'cash' : 'other');

/** رفع صور نافذة «يوم جديد» بعد فتح اليوم. */
export async function uploadAll(date: string, photos: NonNullable<LiveForm['_photos']>): Promise<void> {
  for (const p of photos) {
    try { await dayCall('post', `/days/${date}/photos?id=${p.id}&label=${p.label}`, p.blob); } catch (e) { toast(errorText(e)); }
  }
}

export function ndPhotosRender(f: LiveForm): void {
  const box = f.querySelector('[data-out="ndph"]'); if (!box) return;
  box.innerHTML = (f._photos ?? []).map((p, i) => `<figure class="ph-mini-c"><img src="${p.data}" alt="" draggable="false"><div class="chips ph-lb">${Object.entries(PH_LABELS).map(([k, l]) => `<button type="button" class="chip" data-act="ndphlabel" data-i="${i}" data-v="${k}" aria-pressed="${p.label === k}">${l}</button>`).join('')}</div><button type="button" class="icon-btn ph-rm" data-act="ndphdel" data-i="${i}" aria-label="أزل الصورة" title="أزل الصورة">${ico('x', 14)}</button></figure>`).join('');
}

async function toJpegs(list: File[]): Promise<{ blob: Blob; data: string }[]> {
  const out: { blob: Blob; data: string }[] = [];
  for (const file of list) { try { out.push(await fileToJpeg(file)); } catch { toast(`تعذّر فتح الصورة ${esc(file.name)}. جرّب صورة بصيغة JPG.`); } }
  return out;
}

export async function addFiles(files: FileList | null | undefined, target: string): Promise<void> {
  const list = [...(files ?? [])].filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
  if (!list.length) { toast('اختر صورًا فقط.'); return; }
  const out = await toJpegs(list); if (!out.length) return;
  if (target === 'newday') {
    const f = modalRoot.querySelector<LiveForm>('form[data-form=newday]'); if (!f) return;
    f._photos = f._photos ?? [];
    for (const o of out) f._photos.push({ id: uuidv7(), label: nextLabel(f._photos), ...o });
    ndPhotosRender(f);
    return;
  }
  const d = S.days[target]; if (!d) return;
  let n = 0;
  for (const o of out) {
    try { await dayCall('post', `/days/${d.id}/photos?id=${uuidv7()}`, o.blob); n++; } catch (e) { toast(errorText(e)); }
  }
  if (modalRoot.querySelector('[data-photos]')) openModal(photosDialog(d.id));
  render();
  if (n) okToast(`أُضيفت ${n === 1 ? 'صورة واحدة' : n === 2 ? 'صورتان' : `${num(n)} صور`} إلى ${esc(dayMid(d.id))}`);
}

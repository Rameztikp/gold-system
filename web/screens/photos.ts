import { html, type Safe } from '../core/dom';
import { T } from '../texts';
import { api, errorText, qs } from '../core/api';
import { shrinkImage } from '../core/image';
import { uuidv7 } from '../../shared/domain';
import { openModal } from '../ui/modal';
import { toast } from '../ui/toast';

export const photosStrip = (photos: { id: string }[]): Safe => html`<div class="photos">
  ${photos.map((p) => html`<button class="thumb" data-photo="${p.id}"><img src="/api/photos/${p.id}" alt="${T.day.photos}" loading="lazy"></button>`)}
  <label class="thumb add">＋<span>${T.day.addPhoto}</span><input type="file" accept="image/*" data-upload hidden multiple></label></div>`;

export async function uploadPhotos(dayId: string, files: FileList): Promise<void> {
  for (const f of Array.from(files)) {
    try {
      const blob = await shrinkImage(f);
      await api.post(`/photos${qs({ id: uuidv7(), dayId })}`, blob);
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }
}

export const showPhoto = (id: string): void => {
  openModal(T.day.photos, html`<img class="photo-full" src="/api/photos/${id}" alt="${T.day.photos}">`);
};

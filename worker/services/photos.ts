import { runBatch } from '../repo/batch';
import * as photosRepo from '../repo/photos';
import { auditAfterChangeQuery } from '../repo/audit';
import { AppError, notFound } from '../lib/errors';
import { isUuidV7 } from '../../shared/domain';
import type { Ctx } from './context';
import { requireDay } from './days';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** فحص الصورة من محتواها (البايتات الأولى)، لا من الاسم. */
export function sniffImageType(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  const riff = String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP';
  return riff ? 'image/webp' : null;
}

export async function uploadPhoto(ctx: Ctx & { bucket: R2Bucket }, input: { id: string; dayId: string; bytes: Uint8Array }) {
  if (!isUuidV7(input.id)) throw new AppError('bad_request', 'id');
  if (input.bytes.byteLength > MAX_PHOTO_BYTES) throw new AppError('too_large');
  const type = sniffImageType(input.bytes);
  if (!type) throw new AppError('bad_request', 'not_image');
  const existing = await photosRepo.getPhoto(ctx.db, ctx.user.branchId, input.id);
  if (existing) return { id: existing.id };
  const day = await requireDay(ctx, input.dayId);
  const r2Key = `${day.branchId}/${day.date}/${input.id}`;
  await ctx.bucket.put(r2Key, input.bytes, { httpMetadata: { contentType: type } });
  const row = { id: input.id, branchId: day.branchId, dayId: day.id, r2Key, bytes: input.bytes.byteLength, contentType: type, createdBy: ctx.user.id, createdAt: ctx.now };
  const audit = { branchId: day.branchId, userId: ctx.user.id, entity: 'photo', entityId: row.id, action: 'create', after: { dayId: day.id } };
  await runBatch(ctx.db, [photosRepo.insertPhotoQuery(ctx.db, row), auditAfterChangeQuery(ctx.db, audit, ctx.now)]);
  return { id: row.id };
}

export async function readPhoto(ctx: Ctx & { bucket: R2Bucket }, id: string) {
  const row = await photosRepo.getPhoto(ctx.db, ctx.user.branchId, id);
  if (!row) throw notFound();
  const obj = await ctx.bucket.get(row.r2Key);
  if (!obj) throw notFound();
  return { body: obj.body, contentType: row.contentType };
}

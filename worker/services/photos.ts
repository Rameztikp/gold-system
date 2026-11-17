import type { Day, PhotoLabel } from '../../shared/domain';
import { isUuidV7 } from '../../shared/domain';
import * as ledgerRepo from '../repo/ledger';
import { auditAfterChangeQuery } from '../repo/audit';
import { runBatch } from '../repo/batch';
import { AppError, notFound } from '../lib/errors';
import type { Ctx } from './context';
import { dayView, logFor, requireDayRow } from './days';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PH_LABELS: Record<PhotoLabel, string> = { sales: 'صفحة المبيعات', cash: 'صفحة الخرج', other: 'صفحة أخرى' };

/** فحص الصورة من محتواها (البايتات الأولى)، لا من الاسم. */
export function sniffImageType(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  const riff = String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP';
  return riff ? 'image/webp' : null;
}

type PCtx = Ctx & { bucket: R2Bucket };

/** أول صورة «صفحة المبيعات»، الثانية «صفحة الخرج»، والباقي «صفحة أخرى» (nextLabel). */
const nextLabel = (list: readonly ledgerRepo.PhotoRow[]): PhotoLabel =>
  !list.some((p) => p.label === 'sales') ? 'sales' : !list.some((p) => p.label === 'cash') ? 'cash' : 'other';

export async function uploadPhoto(ctx: PCtx, input: { id: string; date: string; bytes: Uint8Array; label?: string }): Promise<Day> {
  if (!isUuidV7(input.id)) throw new AppError('bad_request', 'id');
  if (input.bytes.byteLength > MAX_PHOTO_BYTES) throw new AppError('too_large');
  const type = sniffImageType(input.bytes);
  if (!type) throw new AppError('bad_request', 'not_image');
  const day = await requireDayRow(ctx, input.date);
  if (await ledgerRepo.findPhotoAnyBranch(ctx.db, input.id)) return dayView(ctx, input.date);
  const wanted = input.label as PhotoLabel | undefined;
  const label = wanted && wanted in PH_LABELS ? wanted : nextLabel(await ledgerRepo.listPhotoRows(ctx.db, ctx.user.branchId, day.id));
  const r2Key = `${day.branchId}/${day.date}/${input.id}`;
  await ctx.bucket.put(r2Key, input.bytes, { httpMetadata: { contentType: type } });
  const row: ledgerRepo.PhotoRow = { id: input.id, branchId: day.branchId, dayId: day.id, label, r2Key, bytes: input.bytes.byteLength, contentType: type, createdBy: ctx.user.name, createdAt: ctx.now, removedAt: null, removedBy: null };
  const log = logFor(ctx, { entity: 'photo', entityId: row.id, action: 'create', kind: 'day', title: 'إضافة صور الدفتر', detail: PH_LABELS[label], dayDate: input.date });
  await runBatch(ctx.db, [ledgerRepo.insertPhotoQuery(ctx.db, row), auditAfterChangeQuery(ctx.db, log, ctx.now)]);
  return dayView(ctx, input.date);
}

async function requirePhoto(ctx: Ctx, id: string): Promise<{ p: ledgerRepo.PhotoRow; date: string }> {
  const p = await ledgerRepo.getPhoto(ctx.db, ctx.user.branchId, id);
  if (!p || p.removedAt) throw notFound();
  const days = await ledgerRepo.listDayRows(ctx.db, ctx.user.branchId);
  return { p, date: days.find((d) => d.id === p.dayId)?.date ?? '' };
}

export async function relabelPhoto(ctx: Ctx, id: string, label: PhotoLabel): Promise<Day> {
  const { p, date } = await requirePhoto(ctx, id);
  if (p.label !== label) {
    const log = logFor(ctx, { entity: 'photo', entityId: id, action: 'label', kind: 'day', title: 'تسمية صورة الدفتر', detail: `${PH_LABELS[p.label]} ← ${PH_LABELS[label]}`, dayDate: date });
    await runBatch(ctx.db, [ledgerRepo.relabelPhotoQuery(ctx.db, { branchId: p.branchId, id, label }), auditAfterChangeQuery(ctx.db, log, ctx.now)]);
  }
  return dayView(ctx, date);
}

/** «أزل الصورة» تخفيها فقط: تبقى محفوظة، والإزالة في السجل. */
export async function removePhoto(ctx: Ctx, id: string): Promise<Day> {
  const { p, date } = await requirePhoto(ctx, id);
  const log = logFor(ctx, { entity: 'photo', entityId: id, action: 'remove', kind: 'day', title: 'إزالة صورة من صور الدفتر', detail: PH_LABELS[p.label], dayDate: date });
  await runBatch(ctx.db, [ledgerRepo.removePhotoQuery(ctx.db, { branchId: p.branchId, id, by: ctx.user.name, at: ctx.now }), auditAfterChangeQuery(ctx.db, log, ctx.now)]);
  return dayView(ctx, date);
}

export async function readPhoto(ctx: PCtx, id: string) {
  const row = await ledgerRepo.getPhoto(ctx.db, ctx.user.branchId, id);
  if (!row) throw notFound();
  const obj = await ctx.bucket.get(row.r2Key);
  if (!obj) throw notFound();
  return { body: obj.body, contentType: row.contentType };
}

import { runBatch } from '../repo/batch';
import type { z } from 'zod';
import { changeReopensDay, normalizeArabic, type Line } from '../../shared/domain';
import type { createLineSchema, updateLineSchema, LineInput } from '../../shared/api';
import * as linesRepo from '../repo/lines';
import { reopenDayAfterChangeQuery } from '../repo/days';
import { auditAfterChangeQuery, type AuditEntry } from '../repo/audit';
import { AppError, notFound } from '../lib/errors';
import { type Ctx, type BatchItems, commitVersioned } from './context';
import { requireDay } from './days';

type LineRow = linesRepo.LineRow;

/** المصروف ليس له وزن ولا قطع ولا أجور. */
function normalizeValues(v: LineInput): LineInput {
  if (v.kind !== 'expense') return v;
  return { ...v, pieces: 0, weightCg: 0, wagesFils: 0, commissionFils: 0, extraFils: 0 };
}

function auditFor(ctx: Ctx, row: LineRow, extra: Partial<AuditEntry>): AuditEntry {
  return { branchId: row.branchId, userId: ctx.user.id, entity: 'line', entityId: row.id, action: 'update', ...extra };
}

async function persist(ctx: Ctx, change: { before: LineRow | null; after: LineRow; audit: AuditEntry }): Promise<void> {
  const { before, after, audit } = change;
  const write = before ? linesRepo.updateLineQuery(ctx.db, after) : linesRepo.insertLineQuery(ctx.db, after);
  const items = [write, auditAfterChangeQuery(ctx.db, audit, ctx.now)];
  if (changeReopensDay(before as Line | null, after as Line)) {
    items.push(reopenDayAfterChangeQuery(ctx.db, after.branchId, after.dayId));
  }
  const batch: BatchItems = items;
  if (before) await commitVersioned(ctx.db, batch);
  else await runBatch(ctx.db, batch);
}

/** الحفظ بنفس المعرّف مرة ثانية (انقطاع النت) يرجع نفس السطر بدون تكرار. */
export async function createLine(ctx: Ctx, input: z.infer<typeof createLineSchema>): Promise<LineRow> {
  const existing = await linesRepo.findLineAnyBranch(ctx.db, input.id);
  if (existing) {
    if (existing.branchId !== ctx.user.branchId) throw new AppError('conflict');
    return existing;
  }
  const day = await requireDay(ctx, input.dayId);
  const { id, dayId, ...values } = input;
  const v = normalizeValues(values);
  const after: LineRow = {
    ...v, id, dayId, branchId: day.branchId, searchText: normalizeArabic(v.description),
    position: await linesRepo.nextPosition(ctx.db, day.branchId, dayId),
    cancelled: false, cancelReason: null, version: 1, createdBy: ctx.user.id, createdAt: ctx.now, updatedAt: ctx.now,
  };
  await persist(ctx, { before: null, after, audit: auditFor(ctx, after, { action: 'create', after }) });
  return after;
}

async function requireLine(ctx: Ctx, id: string): Promise<LineRow> {
  const line = await linesRepo.getLine(ctx.db, ctx.user.branchId, id);
  if (!line) throw notFound();
  return line;
}

async function change(ctx: Ctx, id: string, edit: (l: LineRow) => { after: LineRow; action: string; reason?: string }) {
  const before = await requireLine(ctx, id);
  const { after, action, reason } = edit(before);
  const row = { ...after, updatedAt: ctx.now };
  await persist(ctx, { before, after: row, audit: auditFor(ctx, before, { action, before, after: row, reason: reason ?? null }) });
  return { ...row, version: row.version + 1 };
}

export const updateLine = (ctx: Ctx, id: string, input: z.infer<typeof updateLineSchema>) =>
  change(ctx, id, (l) => {
    const { version, ...values } = input;
    const v = normalizeValues(values);
    return { action: 'update', after: { ...l, ...v, searchText: normalizeArabic(v.description), version } };
  });

export const cancelLine = (ctx: Ctx, id: string, input: { reason: string; version: number }) =>
  change(ctx, id, (l) => {
    if (l.cancelled) throw new AppError('bad_request', 'already_cancelled');
    return { action: 'cancel', reason: input.reason, after: { ...l, cancelled: true, cancelReason: input.reason, version: input.version } };
  });

export const restoreLine = (ctx: Ctx, id: string, input: { version: number }) =>
  change(ctx, id, (l) => {
    if (!l.cancelled) throw new AppError('bad_request', 'not_cancelled');
    return { action: 'restore', after: { ...l, cancelled: false, cancelReason: null, version: input.version } };
  });

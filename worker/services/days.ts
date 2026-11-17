import { runBatch } from '../repo/batch';
import { computeTotals, compareWithLedger, statusAfterCompare, isValidDate, type Ledger, type Totals, type CompareItem } from '../../shared/domain';
import type { z } from 'zod';
import type { compareSchema, updateDayHeaderSchema } from '../../shared/api';
import * as daysRepo from '../repo/days';
import * as linesRepo from '../repo/lines';
import * as photosRepo from '../repo/photos';
import { auditAfterChangeQuery } from '../repo/audit';
import { AppError, notFound } from '../lib/errors';
import { type Ctx, commitVersioned } from './context';
import { uuidv7 } from '../../shared/domain';

export const ledgerOf = (d: daysRepo.DayRow): Ledger => ({
  salesFils: d.ledgerSalesFils, salesCg: d.ledgerSalesCg,
  purchasesFils: d.ledgerPurchasesFils, purchasesCg: d.ledgerPurchasesCg,
  expensesFils: d.ledgerExpensesFils, wagesFils: d.ledgerWagesFils,
});

export interface DayView {
  day: daysRepo.DayRow;
  lines: linesRepo.LineRow[];
  photos: { id: string; createdAt: number }[];
  totals: Totals;
  compare: CompareItem[];
}

export async function requireDay(ctx: Ctx, dayId: string): Promise<daysRepo.DayRow> {
  const day = await daysRepo.getDay(ctx.db, ctx.user.branchId, dayId);
  if (!day) throw notFound();
  return day;
}

export async function getDayView(ctx: Ctx, dayId: string): Promise<DayView> {
  const day = await requireDay(ctx, dayId);
  const [lines, photos] = await Promise.all([
    linesRepo.listDayLines(ctx.db, ctx.user.branchId, day.id),
    photosRepo.listDayPhotos(ctx.db, ctx.user.branchId, day.id),
  ]);
  const totals = computeTotals(lines);
  return {
    day, lines, totals,
    photos: photos.map((p) => ({ id: p.id, createdAt: p.createdAt })),
    compare: compareWithLedger(totals, ledgerOf(day)),
  };
}

export async function createDay(ctx: Ctx, date: string): Promise<daysRepo.DayRow> {
  if (!isValidDate(date)) throw new AppError('bad_request', 'invalid_date');
  const existing = await daysRepo.getDayByDate(ctx.db, ctx.user.branchId, date);
  if (existing) return existing;
  const row: daysRepo.DayRow = {
    id: uuidv7(ctx.now), branchId: ctx.user.branchId, date, goldPriceFils: null, note: '',
    ledgerSalesFils: null, ledgerSalesCg: null, ledgerPurchasesFils: null, ledgerPurchasesCg: null,
    ledgerExpensesFils: null, ledgerWagesFils: null, status: 'not_compared', version: 1,
    createdBy: ctx.user.id, createdAt: ctx.now,
  };
  const audit = { branchId: row.branchId, userId: ctx.user.id, entity: 'day', entityId: row.id, action: 'create', after: { date } };
  await runBatch(ctx.db, [daysRepo.insertDayQuery(ctx.db, row), auditAfterChangeQuery(ctx.db, audit, ctx.now)]);
  return row;
}

async function saveDay(ctx: Ctx, change: { before: daysRepo.DayRow; after: daysRepo.DayRow; action: string }): Promise<void> {
  const { before, after, action } = change;
  const audit = { branchId: before.branchId, userId: ctx.user.id, entity: 'day', entityId: before.id, action, before, after };
  await commitVersioned(ctx.db, [daysRepo.updateDayQuery(ctx.db, after), auditAfterChangeQuery(ctx.db, audit, ctx.now)]);
}

/** تعديل الأسعار والملاحظة لا يعيد فتح اليوم. */
export async function updateHeader(ctx: Ctx, dayId: string, input: z.infer<typeof updateDayHeaderSchema>): Promise<void> {
  const before = await requireDay(ctx, dayId);
  await saveDay(ctx, { before, after: { ...before, goldPriceFils: input.goldPriceFils, note: input.note, version: input.version }, action: 'update_header' });
}

export async function compareDay(ctx: Ctx, dayId: string, input: z.infer<typeof compareSchema>): Promise<DayView> {
  const view = await getDayView(ctx, dayId);
  const items = compareWithLedger(view.totals, input.ledger);
  const l = input.ledger;
  const after: daysRepo.DayRow = {
    ...view.day, version: input.version, status: statusAfterCompare(items, input.confirmLedgerError),
    ledgerSalesFils: l.salesFils, ledgerSalesCg: l.salesCg, ledgerPurchasesFils: l.purchasesFils,
    ledgerPurchasesCg: l.purchasesCg, ledgerExpensesFils: l.expensesFils, ledgerWagesFils: l.wagesFils,
  };
  await saveDay(ctx, { before: view.day, after, action: 'compare' });
  return getDayView(ctx, dayId);
}

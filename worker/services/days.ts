import type { z } from 'zod';
import { compareLedger, hasVal, isValidDate, lerrNote, T, toFils, uuidv7, CMP_ROWS, pr, type Day } from '../../shared/domain';
import type { compareSchema, dayDataSchema, newDaySchema, pricesSchema } from '../../shared/api';
import * as ledgerRepo from '../repo/ledger';
import { dayToWire, ledgerCols } from '../repo/wire';
import { auditAfterChangeQuery, type AuditEntry } from '../repo/audit';
import { runBatch } from '../repo/batch';
import { AppError, notFound } from '../lib/errors';
import { type Ctx, commitVersioned } from './context';

export async function requireDayRow(ctx: Ctx, date: string): Promise<ledgerRepo.DayRow> {
  const d = await ledgerRepo.getDayByDate(ctx.db, ctx.user.branchId, date);
  if (!d) throw notFound();
  return d;
}

export async function dayView(ctx: Ctx, date: string): Promise<Day> {
  const d = await requireDayRow(ctx, date);
  const [lines, photos] = await Promise.all([
    ledgerRepo.listLineRows(ctx.db, ctx.user.branchId, d.id),
    ledgerRepo.listPhotoRows(ctx.db, ctx.user.branchId, d.id),
  ]);
  return dayToWire(d, lines, photos);
}

export const logFor = (ctx: Ctx, e: Omit<AuditEntry, 'branchId' | 'userId' | 'who'>): AuditEntry =>
  ({ branchId: ctx.user.branchId, userId: ctx.user.id, who: ctx.user.name, ...e });

const fils = (n: number | null): number | null => (n === null ? null : toFils(n));

/** فتح يوم جديد (newDay في النموذج). */
export async function createDay(ctx: Ctx, input: z.infer<typeof newDaySchema>): Promise<Day> {
  if (!isValidDate(input.date)) throw new AppError('bad_request', 'date');
  if (await ledgerRepo.getDayByDate(ctx.db, ctx.user.branchId, input.date)) throw new AppError('conflict', 'day_exists');
  const row: ledgerRepo.DayRow = {
    id: uuidv7(ctx.now), branchId: ctx.user.branchId, date: input.date, buyFils: toFils(input.buy), sellFils: fils(input.sell),
    commFils: null, xLabel: '', xFils: null, status: 'open', note: '', ...ledgerCols({}), version: 1,
    createdBy: ctx.user.id, createdAt: ctx.now,
  };
  const detail = `سعر الشراء ${input.buy}${input.sell !== null ? `، سعر البيع ${input.sell}` : ''}`;
  const log = logFor(ctx, { entity: 'day', entityId: row.id, action: 'create', kind: 'day', title: 'فتح اليوم', detail, dayDate: input.date, after: row });
  await runBatch(ctx.db, [ledgerRepo.insertDayQuery(ctx.db, row), auditAfterChangeQuery(ctx.db, log, ctx.now)]);
  return dayView(ctx, input.date);
}

/** تعديل السعر من رأس اليوم — لا يعيد فتح اليوم (savePrices). */
export async function setPrices(ctx: Ctx, date: string, input: z.infer<typeof pricesSchema>): Promise<Day> {
  const before = await requireDayRow(ctx, date);
  const after = { ...before, buyFils: toFils(input.buy), sellFils: fils(input.sell), version: input.v };
  const ch: string[] = [];
  if (before.buyFils !== after.buyFils) ch.push(`سعر الشراء: ${pr(before.buyFils / 100)} ← ${pr(input.buy)}`);
  if (before.sellFils !== after.sellFils) ch.push(`سعر البيع: ${pr(before.sellFils === null ? null : before.sellFils / 100)} ← ${pr(input.sell)}`);
  if (!ch.length) return dayView(ctx, date);
  const log = logFor(ctx, { entity: 'day', entityId: before.id, action: 'prices', kind: 'day', title: 'تعديل السعر', detail: ch.join('؛ '), dayDate: date, before, after });
  await commitVersioned(ctx.db, [ledgerRepo.updateDayQuery(ctx.db, after), auditAfterChangeQuery(ctx.db, log, ctx.now)]);
  return dayView(ctx, date);
}

interface DayDataChange { title: string; kind: 'add' | 'edit'; detail: string; reopens: boolean }

function dayDataChange(before: ledgerRepo.DayRow, after: ledgerRepo.DayRow): DayDataChange | null {
  const show = (f: number | null): string => (f === null ? '—' : String(f / 100));
  const commCh = before.commFils !== after.commFils;
  const xCh = before.xFils !== after.xFils;
  if (!commCh && !xCh && before.xLabel === after.xLabel) return null;
  const ch: string[] = [];
  const commNew = before.commFils === null && after.commFils !== null;
  if (commCh) ch.push(commNew ? `العمولة: ${show(after.commFils)}` : `العمولة: ${show(before.commFils)} ← ${show(after.commFils)}`);
  if (xCh || before.xLabel !== after.xLabel) ch.push(`البند الإضافي: ${before.xLabel} ${show(before.xFils)} ← ${after.xLabel} ${show(after.xFils)}`);
  const xNew = before.xFils === null && after.xFils !== null;
  const [kind, title] = commNew ? ['add', 'إضافة العمولة'] as const : commCh ? ['edit', 'تعديل العمولة'] as const
    : xNew ? ['add', 'إضافة بند إضافي'] as const : ['edit', 'تعديل البند الإضافي'] as const;
  return { kind, title, detail: ch.join('؛ '), reopens: commCh || xCh };
}

/** العمولة والبند الإضافي (saveDayData). تعديل العمولة أو مبلغ البند يعيد فتح اليوم. */
export async function setDayData(ctx: Ctx, date: string, input: z.infer<typeof dayDataSchema>): Promise<Day> {
  const before = await requireDayRow(ctx, date);
  const after: ledgerRepo.DayRow = { ...before, commFils: fils(input.comm), xLabel: input.xl, xFils: fils(input.x), version: input.v };
  const change = dayDataChange(before, after);
  if (!change) return dayView(ctx, date);
  if (change.reopens && (after.status === 'ok' || after.status === 'lerr')) Object.assign(after, { status: 'open', note: '' });
  const log = logFor(ctx, { entity: 'day', entityId: before.id, action: 'daydata', kind: change.kind, title: change.title, detail: change.detail, dayDate: date, before, after });
  await commitVersioned(ctx.db, [ledgerRepo.updateDayQuery(ctx.db, after), auditAfterChangeQuery(ctx.db, log, ctx.now)]);
  return dayView(ctx, date);
}

/** المقارنة بالدفتر (saveCompare). الخادم يعيد الحساب بنفسه ولا يثق بالنتيجة القادمة من الجهاز. */
export async function compareDay(ctx: Ctx, date: string, input: z.infer<typeof compareSchema>): Promise<Day> {
  const view = await dayView(ctx, date);
  const before = await requireDayRow(ctx, date);
  const ledger = Object.fromEntries(Object.entries(input.ledger).filter(([, v]) => hasVal(v)));
  const r = compareLedger(T(view), ledger);
  if (!r.filled) throw new AppError('bad_request', 'empty_ledger');
  if (input.lerr !== r.bad.length > 0) throw new AppError('bad_request', input.lerr ? 'no_mismatch' : 'mismatch');
  const note = input.lerr ? lerrNote(r.bad) : '';
  const after: ledgerRepo.DayRow = { ...before, ...ledgerCols(ledger), status: input.lerr ? 'lerr' : 'ok', note, version: input.v };
  const title = input.lerr ? 'حُفظ مع خطأ في جمع الدفتر' : 'قورن بالدفتر: مطابق';
  const detail = input.lerr ? note : `${r.filled} من ${CMP_ROWS.length} مجاميع`;
  const log = logFor(ctx, { entity: 'day', entityId: before.id, action: 'compare', kind: 'check', title, detail, dayDate: date, before, after });
  await commitVersioned(ctx.db, [ledgerRepo.updateDayQuery(ctx.db, after), auditAfterChangeQuery(ctx.db, log, ctx.now)]);
  return dayView(ctx, date);
}

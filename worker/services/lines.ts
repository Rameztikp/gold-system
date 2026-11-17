import type { z } from 'zod';
import { describe, diffText, SEC_ONE, toFils, type AnyLine, type Day, type Sec } from '../../shared/domain';
import { lineFields, type addLineSchema, type cancelLineSchema } from '../../shared/api';
import * as ledgerRepo from '../repo/ledger';
import { lineToWire } from '../repo/wire';
import { auditAfterChangeQuery } from '../repo/audit';
import { runBatch } from '../repo/batch';
import { AppError, notFound } from '../lib/errors';
import { type Ctx, type BatchItems, commitVersioned } from './context';
import { dayView, logFor, requireDayRow } from './days';
import { addEmployeeName } from './settings';

type LineRow = ledgerRepo.LineRow;
type Fields = Pick<LineRow, 'd' | 'g' | 'm' | 'k' | 'mkFils' | 'amountFils' | 't' | 'c' | 'emp'>;

/** يتحقق من حقول السطر حسب القسم (readLine في النموذج) ويحوّلها لأعداد صحيحة. */
export function parseFields(sec: Sec, raw: unknown): Fields {
  const r = lineFields[sec].safeParse(raw);
  if (!r.success) throw new AppError('bad_request', r.error.issues[0]?.path.join('.') ?? 'line');
  const v = r.data as Record<string, unknown>;
  const base: Fields = { d: String(v.d), g: null, m: '', k: '', mkFils: null, amountFils: 0, t: '', c: '', emp: '' };
  if (sec === 'sales') return { ...base, g: v.g as number | null, m: String(v.m), k: String(v.k), mkFils: v.mk === null ? null : toFils(v.mk), amountFils: toFils(v.p) };
  if (sec === 'purch') return { ...base, g: v.g as number | null, m: String(v.m), amountFils: toFils(v.a), t: String(v.t) };
  return { ...base, c: String(v.c), emp: String(v.emp), amountFils: toFils(v.a) };
}

const touchesCompare = (sec: Sec): boolean => sec !== 'exp';

async function lineNo(ctx: Ctx, l: LineRow): Promise<number> {
  const all = await ledgerRepo.listLineRows(ctx.db, ctx.user.branchId, l.dayId);
  return all.filter((x) => x.sec === l.sec && x.position <= l.position).length;
}

async function dayDateOf(ctx: Ctx, dayId: string): Promise<string> {
  const days = await ledgerRepo.listDayRows(ctx.db, ctx.user.branchId);
  const d = days.find((x) => x.id === dayId);
  if (!d) throw notFound();
  return d.date;
}

/** إضافة سطر. نفس المعرّف مرة ثانية (انقطاع النت) يرجع اليوم بدون تكرار. */
export async function addLine(ctx: Ctx, date: string, input: z.infer<typeof addLineSchema>): Promise<Day> {
  const day = await requireDayRow(ctx, date);
  const existing = await ledgerRepo.getLine(ctx.db, input.id);
  if (existing) {
    if (existing.branchId !== ctx.user.branchId || existing.dayId !== day.id) throw new AppError('conflict');
    return dayView(ctx, date);
  }
  const f = parseFields(input.sec, input.line);
  const row: LineRow = {
    ...f, id: input.id, branchId: day.branchId, dayId: day.id, sec: input.sec, position: await ledgerRepo.nextPosition(ctx.db, day.id),
    xReason: null, xAt: null, xBy: null, version: 1, createdBy: ctx.user.id, createdAt: ctx.now, updatedAt: ctx.now,
  };
  const no = (await ledgerRepo.listLineRows(ctx.db, ctx.user.branchId, day.id)).filter((x) => x.sec === input.sec).length + 1;
  const log = logFor(ctx, { entity: 'line', entityId: row.id, action: 'create', kind: 'add', title: `إضافة سطر ${SEC_ONE[input.sec]} ${no}`, detail: describe(input.sec, lineToWire(row)), dayDate: date, after: row });
  const items: BatchItems = [ledgerRepo.insertLineQuery(ctx.db, row), auditAfterChangeQuery(ctx.db, log, ctx.now)];
  if (touchesCompare(input.sec)) items.push(ledgerRepo.reopenAfterChangeQuery(ctx.db, day.branchId, day.id));
  await runBatch(ctx.db, items);
  if (input.sec === 'exp' && row.emp) await addEmployeeName(ctx, row.emp);
  return dayView(ctx, date);
}

async function requireLine(ctx: Ctx, id: string): Promise<LineRow> {
  const l = await ledgerRepo.getLine(ctx.db, id);
  if (!l || l.branchId !== ctx.user.branchId) throw notFound();
  return l;
}

interface Change { before: LineRow; after: LineRow; kind: 'edit' | 'cancel'; title: string; detail: string; reopens: boolean }

async function persist(ctx: Ctx, c: Change): Promise<Day> {
  const date = await dayDateOf(ctx, c.before.dayId);
  const log = logFor(ctx, { entity: 'line', entityId: c.before.id, action: c.kind, kind: c.kind, title: c.title, detail: c.detail, dayDate: date, before: c.before, after: c.after });
  const items: BatchItems = [ledgerRepo.updateLineQuery(ctx.db, c.after), auditAfterChangeQuery(ctx.db, log, ctx.now)];
  if (c.reopens) items.push(ledgerRepo.reopenAfterChangeQuery(ctx.db, c.before.branchId, c.before.dayId));
  await commitVersioned(ctx.db, items);
  return dayView(ctx, date);
}

/** تعديل سطر: يُسجَّل «قبل ← بعد». أي تغيير في البيع أو الشراء يعيد فتح اليوم. */
export async function editLine(ctx: Ctx, id: string, input: { line: unknown; v: number }): Promise<Day> {
  const before = await requireLine(ctx, id);
  const after: LineRow = { ...before, ...parseFields(before.sec, input.line), version: input.v, updatedAt: ctx.now };
  const dt = diffText(before.sec, lineToWire(before), lineToWire(after));
  if (!dt) return dayView(ctx, await dayDateOf(ctx, before.dayId));
  if (before.sec === 'exp' && after.emp) await addEmployeeName(ctx, after.emp);
  const title = `تعديل سطر ${SEC_ONE[before.sec]} ${await lineNo(ctx, before)}، ${after.d}`;
  return persist(ctx, { before, after, kind: 'edit', title, detail: dt, reopens: touchesCompare(before.sec) });
}

/** الإلغاء لا يحذف: السطر يبقى ظاهرًا باهتًا مع السبب. */
export async function cancelLine(ctx: Ctx, id: string, input: z.infer<typeof cancelLineSchema>): Promise<Day> {
  const before = await requireLine(ctx, id);
  if (before.xReason) throw new AppError('bad_request', 'already_cancelled');
  const after: LineRow = { ...before, xReason: input.r, xAt: ctx.now, xBy: ctx.user.name, version: input.v, updatedAt: ctx.now };
  const detail = `${describe(before.sec, lineToWire(before) as AnyLine)}. السبب: ${input.r}`;
  const title = `إلغاء سطر ${SEC_ONE[before.sec]} ${await lineNo(ctx, before)}`;
  return persist(ctx, { before, after, kind: 'cancel', title, detail, reopens: touchesCompare(before.sec) });
}

export async function restoreLine(ctx: Ctx, id: string, input: { v: number }): Promise<Day> {
  const before = await requireLine(ctx, id);
  if (!before.xReason) throw new AppError('bad_request', 'not_cancelled');
  const after: LineRow = { ...before, xReason: null, xAt: null, xBy: null, version: input.v, updatedAt: ctx.now };
  const title = `إرجاع سطر ملغى ${await lineNo(ctx, before)}`;
  return persist(ctx, { before, after, kind: 'edit', title, detail: describe(before.sec, lineToWire(after)), reopens: touchesCompare(before.sec) });
}

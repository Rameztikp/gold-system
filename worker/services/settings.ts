import * as branchesRepo from '../repo/branches';
import { auditAfterChangeQuery } from '../repo/audit';
import { runBatch } from '../repo/batch';
import { notFound } from '../lib/errors';
import { type Ctx, commitVersioned, requireOwner } from './context';

/** أنواع المصروفات الافتراضية (CATS في النموذج). */
export const DEFAULT_CATS = ['ضيافة وكفتيريا', 'مشاوير ومواصلات', 'إيجارات', 'جوال واتصالات', 'للموظفين', 'على الكريدية', 'أخرى'];

export interface BranchView {
  name: string; currency: string; countryCode: string; timezone: string; weekStart: number;
  cats: string[]; names: string[]; wa: string; version: number;
}

const parseList = (json: string | null, fallback: string[]): string[] => {
  try { return json ? (JSON.parse(json) as string[]) : fallback; } catch { return fallback; }
};

async function branchRow(ctx: Ctx): Promise<branchesRepo.BranchRow> {
  const b = await branchesRepo.getBranch(ctx.db, ctx.user.branchId);
  if (!b) throw notFound();
  return b;
}

export const toView = (b: branchesRepo.BranchRow): BranchView => ({
  name: b.name, currency: b.currency, countryCode: b.countryCode, timezone: b.timezone, weekStart: b.weekStart,
  cats: parseList(b.catsJson, DEFAULT_CATS), names: parseList(b.namesJson, []), wa: b.wa ?? '', version: b.version,
});

export const getSettings = async (ctx: Ctx): Promise<BranchView> => toView(await branchRow(ctx));

async function save(ctx: Ctx, change: { patch: Partial<branchesRepo.BranchRow>; title: string; detail: string }): Promise<BranchView> {
  const before = await branchRow(ctx);
  const after = { ...before, ...change.patch };
  const log = { branchId: before.id, userId: ctx.user.id, who: ctx.user.name, entity: 'branch', entityId: before.id, action: 'update', kind: 'settings' as const, title: change.title, detail: change.detail, before, after };
  await commitVersioned(ctx.db, [branchesRepo.updateBranchQuery(ctx.db, after), auditAfterChangeQuery(ctx.db, log, ctx.now)]);
  return toView({ ...after, version: after.version + 1 });
}

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export async function setWeekStart(ctx: Ctx, weekStart: number): Promise<BranchView> {
  requireOwner(ctx);
  return save(ctx, { patch: { weekStart }, title: 'بداية الأسبوع', detail: DAYS_AR[weekStart] ?? '' });
}

export async function setWa(ctx: Ctx, wa: string): Promise<BranchView> {
  requireOwner(ctx);
  return save(ctx, { patch: { wa }, title: 'رقم واتساب صاحب المحل', detail: wa ? `+${wa}` : 'مُسح الرقم' });
}

export async function addCat(ctx: Ctx, name: string): Promise<BranchView> {
  requireOwner(ctx);
  const cur = await getSettings(ctx);
  if (cur.cats.includes(name)) return cur;
  return save(ctx, { patch: { catsJson: JSON.stringify([...cur.cats, name]) }, title: 'إضافة نوع مصروف', detail: name });
}

export async function addName(ctx: Ctx, name: string): Promise<BranchView> {
  requireOwner(ctx);
  return addEmployeeName(ctx, name);
}

/** اسم موظف جديد يُضاف تلقائيًا عند حفظ مصروف باسمه (كما في النموذج). */
export async function addEmployeeName(ctx: Ctx, name: string): Promise<BranchView> {
  const b = await branchRow(ctx);
  const cur = toView(b);
  if (cur.names.includes(name)) return cur;
  const after = { ...b, namesJson: JSON.stringify([...cur.names, name]) };
  const log = { branchId: b.id, userId: ctx.user.id, who: ctx.user.name, entity: 'branch', entityId: b.id, action: 'add_name', kind: 'settings' as const, title: 'إضافة اسم موظف', detail: name };
  await runBatch(ctx.db, [branchesRepo.updateBranchQuery(ctx.db, after), auditAfterChangeQuery(ctx.db, log, ctx.now)]);
  return toView({ ...after, version: after.version + 1 });
}

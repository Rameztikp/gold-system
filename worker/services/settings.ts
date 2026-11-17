import * as branchesRepo from '../repo/branches';
import { auditAfterChangeQuery } from '../repo/audit';
import { notFound } from '../lib/errors';
import { type Ctx, commitVersioned, requireOwner } from './context';

export async function getSettings(ctx: Ctx): Promise<branchesRepo.BranchRow> {
  const b = await branchesRepo.getBranch(ctx.db, ctx.user.branchId);
  if (!b) throw notFound();
  return b;
}

export async function updateSettings(ctx: Ctx, input: Omit<branchesRepo.BranchRow, 'id'>): Promise<branchesRepo.BranchRow> {
  requireOwner(ctx);
  const before = await getSettings(ctx);
  const after = { ...input, id: before.id };
  const audit = { branchId: before.id, userId: ctx.user.id, entity: 'branch', entityId: before.id, action: 'update', before, after };
  await commitVersioned(ctx.db, [branchesRepo.updateBranchQuery(ctx.db, after), auditAfterChangeQuery(ctx.db, audit, ctx.now)]);
  return { ...after, version: after.version + 1 };
}

import { listAudit } from '../repo/audit';
import { type Ctx, requireOwner } from './context';

export async function auditPage(ctx: Ctx, opts: { beforeId?: number; limit: number }) {
  requireOwner(ctx);
  const rows = await listAudit(ctx.db, ctx.user.branchId, opts);
  return rows.map((r) => ({
    ...r,
    before: r.beforeJson ? (JSON.parse(r.beforeJson) as unknown) : null,
    after: r.afterJson ? (JSON.parse(r.afterJson) as unknown) : null,
  }));
}

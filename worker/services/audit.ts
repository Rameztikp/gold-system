import { listAudit } from '../repo/audit';
import { type Ctx, requireOwner } from './context';

/** سجل التعديلات بشكل النموذج: يوم الدفتر، العنوان، التفاصيل، من، ومتى. */
export async function logPage(ctx: Ctx, opts: { kind: string; beforeId?: number }) {
  requireOwner(ctx);
  const rows = await listAudit(ctx.db, ctx.user.branchId, { beforeId: opts.beforeId, kind: opts.kind === 'all' ? undefined : opts.kind, limit: 200 });
  return rows.map((r) => ({ id: r.id, at: r.at, who: r.who ?? '', day: r.dayDate ?? '', kind: r.kind ?? r.action, title: r.title ?? r.action, detail: r.detail ?? '' }));
}

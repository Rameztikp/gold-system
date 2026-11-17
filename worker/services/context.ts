import type { Db } from '../db/client';
import type { SessionUser } from '../env';
import { AppError } from '../lib/errors';
import { runBatch, type BatchQuery } from '../repo/batch';
export { runBatch };

export interface Ctx {
  db: Db;
  user: SessionUser;
  now: number;
}

export type BatchItems = BatchQuery[];

/** ينفّذ الدفعة كعملية واحدة، ويرجع 409 إذا الأمر الأول (المشروط بـ version) لم يغيّر شيئًا. */
export async function commitVersioned(db: Db, items: BatchItems): Promise<void> {
  const [first] = await runBatch(db, items);
  if (!first || first.results.length === 0) throw new AppError('conflict');
}

export function requireOwner(ctx: Ctx): void {
  if (ctx.user.role !== 'owner') throw new AppError('forbidden');
}

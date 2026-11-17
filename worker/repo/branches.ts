import { eq, and } from 'drizzle-orm';
import { type Db, schema } from '../db/client';

const { branches } = schema;
export type BranchRow = typeof branches.$inferSelect;

export const countBranches = async (db: Db): Promise<number> => (await db.select().from(branches)).length;

export const getBranch = async (db: Db, branchId: string): Promise<BranchRow | undefined> =>
  db.select().from(branches).where(eq(branches.id, branchId)).get();

export const insertBranchQuery = (db: Db, row: BranchRow) => db.insert(branches).values(row);

export const updateBranchQuery = (db: Db, row: BranchRow) =>
  db.update(branches)
    .set({ ...row, version: row.version + 1 })
    .where(and(eq(branches.id, row.id), eq(branches.version, row.version)))
    .returning({ version: branches.version });

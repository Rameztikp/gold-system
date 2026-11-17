import { and, eq, asc, sql } from 'drizzle-orm';
import { type Db, schema } from '../db/client';

const { users } = schema;
export type UserRow = typeof users.$inferSelect;

export const countUsers = async (db: Db): Promise<number> =>
  (await db.select({ n: sql<number>`count(*)` }).from(users).get())?.n ?? 0;

export const findByUsername = async (db: Db, username: string): Promise<UserRow | undefined> =>
  db.select().from(users).where(eq(users.username, username)).get();

export const findById = async (db: Db, id: string): Promise<UserRow | undefined> =>
  db.select().from(users).where(eq(users.id, id)).get();

export const findInBranch = async (db: Db, branchId: string, id: string): Promise<UserRow | undefined> =>
  db.select().from(users).where(and(eq(users.branchId, branchId), eq(users.id, id))).get();

export const listUsers = async (db: Db, branchId: string): Promise<UserRow[]> =>
  db.select().from(users).where(eq(users.branchId, branchId)).orderBy(asc(users.createdAt));

export const insertUserQuery = (db: Db, row: UserRow) => db.insert(users).values(row);

export const updateUserQuery = (db: Db, row: UserRow) =>
  db.update(users)
    .set({ ...row, version: row.version + 1 })
    .where(and(eq(users.id, row.id), eq(users.branchId, row.branchId), eq(users.version, row.version)))
    .returning({ version: users.version });

/** عدّاد المحاولات الفاشلة يُحدَّث بدون version لأنه ليس تعديلًا من المستخدم. */
export const setLoginState = (db: Db, id: string, state: { failedAttempts: number; lockedUntil: number | null }) =>
  db.update(users).set(state).where(eq(users.id, id));

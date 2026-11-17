import { and, eq, asc } from 'drizzle-orm';
import { type Db, schema } from '../db/client';

const { photos } = schema;
export type PhotoRow = typeof photos.$inferSelect;

export const getPhoto = async (db: Db, branchId: string, id: string): Promise<PhotoRow | undefined> =>
  db.select().from(photos).where(and(eq(photos.branchId, branchId), eq(photos.id, id))).get();

export const findPhotoAnyBranch = async (db: Db, id: string): Promise<PhotoRow | undefined> =>
  db.select().from(photos).where(eq(photos.id, id)).get();

export const listDayPhotos = async (db: Db, branchId: string, dayId: string): Promise<PhotoRow[]> =>
  db.select().from(photos).where(and(eq(photos.branchId, branchId), eq(photos.dayId, dayId)))
    .orderBy(asc(photos.createdAt));

export const insertPhotoQuery = (db: Db, row: PhotoRow) => db.insert(photos).values(row);

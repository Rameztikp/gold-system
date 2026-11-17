import type { Db } from './db/client';

export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  SETUP_TOKEN?: string;
  BACKUP_TOKEN?: string;
  RP_ID?: string;
  RP_NAME: string;
  ORIGIN?: string;
}

export type Role = 'owner' | 'entry';

export interface SessionUser {
  id: string;
  branchId: string;
  name: string;
  role: Role;
}

export interface AppVars {
  db: Db;
  user: SessionUser;
}

export type AppEnv = { Bindings: Env; Variables: AppVars };

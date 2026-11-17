import { runBatch } from '../repo/batch';
import * as authRepo from '../repo/auth';
import * as usersRepo from '../repo/users';
import { insertSecurityEvent } from '../repo/audit';
import { randomToken, sha256 } from '../lib/crypto';
import type { Db } from '../db/client';
import type { SessionUser } from '../env';

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface RequestMeta { ip: string | null; userAgent: string | null; now: number }

export async function createSession(db: Db, user: usersRepo.UserRow, meta: RequestMeta): Promise<string> {
  const token = randomToken();
  await runBatch(db, [
    authRepo.insertSession(db, {
      idHash: await sha256(token), userId: user.id, branchId: user.branchId,
      expiresAt: meta.now + SESSION_TTL_MS, createdAt: meta.now, revokedAt: null,
    }),
    insertSecurityEvent(db, { branchId: user.branchId, userId: user.id, event: 'login', ip: meta.ip, userAgent: meta.userAgent, at: meta.now }),
  ]);
  return token;
}

export async function resolveSession(db: Db, token: string, now: number): Promise<SessionUser | null> {
  const s = await authRepo.findActiveSession(db, await sha256(token), now);
  if (!s) return null;
  const u = await usersRepo.findById(db, s.userId);
  if (!u || u.status !== 'active') return null;
  return { id: u.id, branchId: u.branchId, name: u.name, role: u.role };
}

export async function endSession(db: Db, token: string, now: number): Promise<void> {
  await authRepo.revokeSession(db, await sha256(token), now);
}

export const logSecurity = (db: Db, event: string, meta: RequestMeta & { userId?: string; branchId?: string }) =>
  insertSecurityEvent(db, {
    event, ip: meta.ip, userAgent: meta.userAgent, at: meta.now,
    userId: meta.userId ?? null, branchId: meta.branchId ?? null,
  });

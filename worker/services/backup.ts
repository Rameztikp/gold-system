import { sql } from 'drizzle-orm';
import type { Db } from '../db/client';

/** الجداول التي تُنسخ كل ليلة (بدون الجلسات والتحديات المؤقتة). */
const TABLES = ['branches', 'users', 'passkeys', 'recovery_codes', 'ledger_days', 'ledger_lines', 'day_photos', 'audit_log', 'security_log'] as const;

export async function exportAll(db: Db): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {};
  for (const t of TABLES) out[t] = await db.all(sql.raw(`SELECT * FROM ${t}`));
  return out;
}

export async function nightlyBackup(db: Db, bucket: R2Bucket, now: Date): Promise<string> {
  const key = `backups/${now.toISOString().slice(0, 10)}.json`;
  const data = { createdAt: now.toISOString(), tables: await exportAll(db) };
  await bucket.put(key, JSON.stringify(data), { httpMetadata: { contentType: 'application/json' } });
  return key;
}

export async function listBackups(bucket: R2Bucket): Promise<{ key: string; size: number }[]> {
  const res = await bucket.list({ prefix: 'backups/' });
  return res.objects.map((o) => ({ key: o.key, size: o.size }));
}

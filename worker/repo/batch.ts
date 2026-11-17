import type { Db } from '../db/client';

interface Built { sql: string; params: unknown[] }
type Query = { toSQL(): Built } | { getQuery(): Built };

const built = (q: Query): Built => ('toSQL' in q ? q.toSQL() : q.getQuery());

/**
 * دفعة D1 كعملية واحدة (transaction). نبنيها مباشرة على D1 لأن دفعات Drizzle
 * لا تدعم أوامر sql`` الخام ذات المعاملات.
 */
export async function runBatch(db: Db, queries: Query[]): Promise<D1Result[]> {
  const d1 = db.$client;
  return d1.batch(queries.map((q) => {
    const b = built(q);
    return d1.prepare(b.sql).bind(...b.params);
  }));
}

export type BatchQuery = Query;

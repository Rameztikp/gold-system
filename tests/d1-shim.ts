import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

type Sqlite = InstanceType<typeof Database>;
type Param = string | number | bigint | Buffer | null;

const meta = (changes = 0) => ({ changes, duration: 0, last_row_id: 0, rows_read: 0, rows_written: changes, size_after: 0, changed_db: changes > 0 });

class Stmt {
  constructor(private readonly db: Sqlite, private readonly sql: string, private readonly params: Param[] = []) {}
  bind(...params: unknown[]): Stmt {
    return new Stmt(this.db, this.sql, params.map((p) => (typeof p === 'boolean' ? Number(p) : (p as Param) ?? null)));
  }
  exec(): { results: Record<string, unknown>[]; changes: number } {
    const s = this.db.prepare(this.sql);
    if (s.reader) {
      const results = s.all(...this.params) as Record<string, unknown>[];
      const isWrite = /^\s*(insert|update|delete)/i.test(this.sql);
      const changes = isWrite ? (this.db.prepare('SELECT changes() AS c').get() as { c: number }).c : 0;
      return { results, changes };
    }
    return { results: [], changes: s.run(...this.params).changes };
  }
  async all() { const r = this.exec(); return { results: r.results, success: true, meta: meta(r.changes) }; }
  async run() { return this.all(); }
  async first() { return (await this.all()).results[0] ?? null; }
  async raw() {
    const s = this.db.prepare(this.sql);
    if (!s.reader) { s.run(...this.params); return []; }
    return s.raw(true).all(...this.params) as unknown[][];
  }
}

/** بديل D1 للاختبارات فوق better-sqlite3 (نفس SQLite). الدفعة = عملية واحدة. */
export function createTestD1(): D1Database {
  const db = new Database(':memory:');
  const dir = join(import.meta.dirname, '..', 'migrations');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    db.exec(readFileSync(join(dir, f), 'utf8').replace(/--> statement-breakpoint/g, ''));
  }
  const shim = {
    prepare: (sql: string) => new Stmt(db, sql),
    batch: async (stmts: Stmt[]) => db.transaction(() => stmts.map((s) => {
      const r = s.exec();
      return { results: r.results, success: true, meta: meta(r.changes) };
    }))(),
    exec: async (sql: string) => { db.exec(sql); return { count: 0, duration: 0 }; },
  };
  return shim as unknown as D1Database;
}

/** R2 مبسّط في الذاكرة. */
export function createTestR2(): R2Bucket {
  const store = new Map<string, { data: Uint8Array; type?: string }>();
  const bucket = {
    put: async (key: string, value: Uint8Array | string, opts?: { httpMetadata?: { contentType?: string } }) => {
      const data = typeof value === 'string' ? new TextEncoder().encode(value) : value;
      store.set(key, { data, type: opts?.httpMetadata?.contentType });
      return { key };
    },
    get: async (key: string) => {
      const o = store.get(key);
      return o ? { body: new Blob([o.data as unknown as ArrayBuffer]).stream(), text: async () => new TextDecoder().decode(o.data) } : null;
    },
    list: async (opts?: { prefix?: string }) => ({
      objects: [...store.entries()].filter(([k]) => k.startsWith(opts?.prefix ?? '')).map(([key, v]) => ({ key, size: v.data.byteLength })),
    }),
  };
  return bucket as unknown as R2Bucket;
}

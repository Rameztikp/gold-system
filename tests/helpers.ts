import { createApp } from '../worker/app';
import type { Env } from '../worker/env';
import { createTestD1, createTestR2 } from './d1-shim';
import { createDb } from '../worker/db/client';
import { hashPassword } from '../worker/lib/crypto';
import * as usersRepo from '../worker/repo/users';
import { uuidv7 } from '../shared/domain';
import { sql } from 'drizzle-orm';

export const ORIGIN = 'https://gold.test';

export function testEnv(): Env {
  return { DB: createTestD1(), PHOTOS: createTestR2(), SETUP_TOKEN: 'setup-token-1234567890', BACKUP_TOKEN: 'backup-token-xyz', RP_ID: 'gold.test', RP_NAME: 'نظام الذهب', ORIGIN };
}

export class Client {
  cookie = '';
  private readonly app = createApp();
  constructor(readonly env: Env) {}

  async req(method: string, path: string, body?: unknown): Promise<{ status: number; json: Record<string, unknown> & { [k: string]: any } }> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const headers: Record<string, string> = { Origin: ORIGIN, Cookie: this.cookie };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await this.app.request(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }, this.env);
    const set = res.headers.get('Set-Cookie');
    if (set) this.cookie = set.split(';')[0] ?? '';
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : {} };
  }
  get = (p: string) => this.req('GET', p);
  post = (p: string, b: unknown = {}) => this.req('POST', p, b);
  patch = (p: string, b: unknown) => this.req('PATCH', p, b);
  put = (p: string, b: unknown) => this.req('PUT', p, b);
}

/** ينشئ الفرع وصاحب المحل ويرجع عميلًا مسجّل الدخول كصاحب المحل. */
export async function setupOwner(env = testEnv()): Promise<Client> {
  const c = new Client(env);
  const r = await c.post('/auth/setup', { token: env.SETUP_TOKEN, ownerName: 'صاحب المحل', username: 'owner', branchName: 'الشارقة' });
  if (r.status !== 200) throw new Error(`setup failed ${r.status}`);
  return c;
}

export async function entryClient(owner: Client, username = 'entry1'): Promise<Client> {
  await owner.post('/admin/users', { name: 'مدخل', username, password: 'password-123456' });
  const c = new Client(owner.env);
  await c.post('/auth/login/password', { username, password: 'password-123456' });
  return c;
}

/** فرع ثانٍ مع مستخدم — لاختبار حارس الفرع. */
export async function otherBranchClient(env: Env): Promise<Client> {
  const db = createDb(env.DB);
  const branchId = uuidv7();
  await db.run(sql.raw(`INSERT INTO branches (id, name, currency, country_code, timezone, week_start, version) VALUES ('${branchId}', 'قطر', 'QAR', '974', 'Asia/Qatar', 6, 1)`));
  await usersRepo.insertUserQuery(db, {
    id: uuidv7(), branchId, name: 'قطر', username: 'qatar', role: 'entry', status: 'active',
    passwordHash: await hashPassword('password-123456'), failedAttempts: 0, lockedUntil: null, version: 1, createdAt: Date.now(),
  });
  const c = new Client(env);
  await c.post('/auth/login/password', { username: 'qatar', password: 'password-123456' });
  return c;
}

export const sale = (over: Record<string, unknown> = {}) => ({ d: 'خاتم ذهب', g: 6, m: '25', k: '21', mk: 50, p: 1500, ...over });
export const purch = (over: Record<string, unknown> = {}) => ({ d: 'ليرة', g: 7, m: '2', a: 3050, t: 'كسر', ...over });
export const exp = (over: Record<string, unknown> = {}) => ({ d: 'ضيافة', c: 'ضيافة وكفتيريا', emp: '', a: 70, ...over });

/** يفتح يومًا ويرجع تاريخه. */
export async function openDay(c: Client, date = '2026-10-01', buy = 425): Promise<string> {
  const r = await c.post('/days', { date, buy, sell: null });
  if (r.status !== 201) throw new Error(`open day ${r.status} ${JSON.stringify(r.json)}`);
  return date;
}

export const addLine = (c: Client, at: { date: string; sec: string; id?: string }, line: Record<string, unknown>) =>
  c.post(`/days/${at.date}/lines`, { id: at.id ?? uuidv7(), sec: at.sec, line });

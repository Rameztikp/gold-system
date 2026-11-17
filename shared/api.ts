import { z } from 'zod';
import { NAME_RE, hasLetter } from './domain/fields';

/** مخططات الطلبات — نفس شروط readLine/savePrices/saveDayData في النموذج، ويتحقق منها الخادم. */

const int = z.number().int();
/** مبلغ بالدرهم بخانتين عشريتين كحد أقصى. */
const amount = z.number().nonnegative().max(1_000_000_000)
  .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, 'خانتان عشريتان كحد أقصى');
const positive = amount.refine((n) => n > 0, 'لازم أكبر من صفر');
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const uuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

export const KARATS = ['24', '22', '21', '18'] as const;
const karats = z.string().max(20).refine((s) => s === '' || s.split(' + ').every((k) => (KARATS as readonly string[]).includes(k)));
const desc = z.string().trim().min(1).max(200).refine(hasLetter, 'البيان لازم فيه كلام، مو أرقام بس');
/** اسم شخص أو نوع أو فرع: حروف بس. */
const person = (min: number) => z.string().trim().min(min).max(60).regex(NAME_RE, 'الاسم حروف بس، بدون أرقام');
const grams = int.min(0).max(100_000).nullable();
const milli = z.string().regex(/^\d{0,2}$/);

export const saleSchema = z.object({ d: desc, g: grams, m: milli, k: karats, mk: amount.nullable(), p: positive });
export const purchSchema = z.object({ d: desc, g: grams, m: milli, a: positive, t: z.enum(['كسر', 'جديد']) })
  .refine((l) => l.g !== null || l.m !== '', { message: 'كل شراء له وزن', path: ['g'] });
export const expSchema = z.object({ d: desc, c: person(1), emp: z.union([z.literal(''), person(1)]), a: positive });

export const lineFields = { sales: saleSchema, purch: purchSchema, exp: expSchema } as const;
export const secSchema = z.enum(['sales', 'purch', 'exp']);

export const addLineSchema = z.object({ id: uuidSchema, sec: secSchema, line: z.record(z.string(), z.unknown()) });
export const editLineSchema = z.object({ line: z.record(z.string(), z.unknown()), v: int });
export const cancelLineSchema = z.object({ r: z.string().trim().min(1).max(300), v: int });
export const restoreLineSchema = z.object({ v: int });

export const newDaySchema = z.object({ date: dateSchema, buy: positive, sell: positive.nullable() });
export const pricesSchema = z.object({ buy: positive, sell: positive.nullable(), v: int });
export const dayDataSchema = z.object({ comm: amount.nullable(), xl: z.string().trim().max(60), x: amount.nullable(), v: int });

const ledgerVal = z.number().nonnegative().max(1_000_000_000).optional();
export const compareSchema = z.object({
  ledger: z.object({ sales: ledgerVal, sw: ledgerVal, mk: ledgerVal, tot: ledgerVal, purch: ledgerVal, pw: ledgerVal }),
  lerr: z.boolean(),
  v: int,
});

export const photoLabelSchema = z.object({ label: z.enum(['sales', 'cash', 'other']) });

export const passwordLoginSchema = z.object({ username: z.string().trim().min(1).max(60), password: z.string().min(1).max(200) });
export const recoveryLoginSchema = z.object({ username: z.string().trim().min(1).max(60), code: z.string().trim().min(4).max(40) });

export const setupSchema = z.object({
  token: z.string().min(16),
  ownerName: person(2),
  username: z.string().trim().regex(/^[a-z0-9._-]{3,30}$/),
  branchName: person(2),
});

export const createUserSchema = z.object({
  name: person(2),
  username: z.string().trim().regex(/^[a-z0-9._-]{3,30}$/),
  password: z.string().min(10).max(200),
});
export const userStatusSchema = z.object({ status: z.enum(['active', 'suspended']), version: int });
export const resetPasswordSchema = z.object({ password: z.string().min(10).max(200), version: int });

export const weekStartSchema = z.object({ weekStart: z.union([z.literal(6), z.literal(0), z.literal(1)]) });
export const waSchema = z.object({ wa: z.string().regex(/^\d{0,15}$/) });
export const nameSchema = z.object({ name: person(1) });
export const logQuerySchema = z.object({
  kind: z.enum(['all', 'add', 'edit', 'cancel', 'day', 'check']).default('all'),
  before: z.coerce.number().int().positive().optional(),
});

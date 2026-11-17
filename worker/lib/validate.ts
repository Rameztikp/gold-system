import type { Context } from 'hono';
import type { z } from 'zod';
import { AppError } from './errors';

export async function body<T extends z.ZodType>(c: Context, schema: T): Promise<z.infer<T>> {
  const json: unknown = await c.req.json().catch(() => null);
  const r = schema.safeParse(json);
  if (!r.success) throw new AppError('bad_request', r.error.issues[0]?.path.join('.') ?? 'invalid');
  return r.data;
}

export function query<T extends z.ZodType>(c: Context, schema: T): z.infer<T> {
  const r = schema.safeParse(c.req.query());
  if (!r.success) throw new AppError('bad_request', r.error.issues[0]?.path.join('.') ?? 'invalid');
  return r.data;
}

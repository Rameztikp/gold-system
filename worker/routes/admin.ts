import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { createUserSchema, logQuerySchema, nameSchema, resetPasswordSchema, userStatusSchema, waSchema, weekStartSchema } from '../../shared/api';
import { body, query } from '../lib/validate';
import { ctxOf } from '../middleware/session';
import * as users from '../services/users';
import * as settings from '../services/settings';
import { logPage } from '../services/audit';

/** «الإدارة» — صاحب المحل فقط (requireOwnerRole في app.ts). */
export const adminRoutes = new Hono<AppEnv>()
  .get('/users', async (c) => c.json({ users: await users.listUsers(ctxOf(c)) }))
  .post('/users', async (c) => c.json(await users.createEntryUser(ctxOf(c), await body(c, createUserSchema)), 201))
  .post('/users/:id/status', async (c) => {
    await users.setStatus(ctxOf(c), c.req.param('id'), await body(c, userStatusSchema));
    return c.json({ ok: true });
  })
  .post('/users/:id/password', async (c) => {
    await users.resetPassword(ctxOf(c), c.req.param('id'), await body(c, resetPasswordSchema));
    return c.json({ ok: true });
  })
  .put('/settings/week-start', async (c) => c.json(await settings.setWeekStart(ctxOf(c), (await body(c, weekStartSchema)).weekStart)))
  .put('/settings/wa', async (c) => c.json(await settings.setWa(ctxOf(c), (await body(c, waSchema)).wa)))
  .post('/settings/cats', async (c) => c.json(await settings.addCat(ctxOf(c), (await body(c, nameSchema)).name)))
  .post('/settings/names', async (c) => c.json(await settings.addName(ctxOf(c), (await body(c, nameSchema)).name)))
  .get('/log', async (c) => {
    const q = query(c, logQuerySchema);
    return c.json({ entries: await logPage(ctxOf(c), { kind: q.kind, beforeId: q.before }) });
  });

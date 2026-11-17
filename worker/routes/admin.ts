import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../env';
import { createUserSchema, resetPasswordSchema, settingsSchema, userStatusSchema } from '../../shared/api';
import { body, query } from '../lib/validate';
import { ctxOf } from '../middleware/session';
import * as users from '../services/users';
import { getSettings, updateSettings } from '../services/settings';
import { auditPage } from '../services/audit';

const auditQuery = z.object({ before: z.coerce.number().int().positive().optional(), limit: z.coerce.number().int().min(1).max(200).default(50) });

/** «الإدارة» — صاحب المحل فقط (requireOwnerRole في index.ts). */
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
  .put('/settings', async (c) => c.json(await updateSettings(ctxOf(c), await body(c, settingsSchema))))
  .get('/audit', async (c) => {
    const q = query(c, auditQuery);
    return c.json({ entries: await auditPage(ctxOf(c), { beforeId: q.before, limit: q.limit }) });
  });

/** الإعدادات للقراءة لكل المستخدمين (العملة والتوقيت لازمة للواجهة). */
export const settingsRoutes = new Hono<AppEnv>().get('/settings', async (c) => c.json(await getSettings(ctxOf(c))));

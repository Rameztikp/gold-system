import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { compareSchema, createDaySchema, rangeSchema, updateDayHeaderSchema } from '../../shared/api';
import { body, query } from '../lib/validate';
import { ctxOf } from '../middleware/session';
import * as days from '../services/days';
import { rangeReport } from '../services/reports';
import { latestDay } from '../repo/days';

export const dayRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json(await rangeReport(ctxOf(c), query(c, rangeSchema))))
  .get('/latest', async (c) => c.json({ day: (await latestDay(c.var.db, c.var.user.branchId)) ?? null }))
  .post('/', async (c) => c.json(await days.createDay(ctxOf(c), (await body(c, createDaySchema)).date), 201))
  .get('/:id', async (c) => c.json(await days.getDayView(ctxOf(c), c.req.param('id'))))
  .patch('/:id', async (c) => {
    await days.updateHeader(ctxOf(c), c.req.param('id'), await body(c, updateDayHeaderSchema));
    return c.json(await days.getDayView(ctxOf(c), c.req.param('id')));
  })
  .post('/:id/compare', async (c) => c.json(await days.compareDay(ctxOf(c), c.req.param('id'), await body(c, compareSchema))));

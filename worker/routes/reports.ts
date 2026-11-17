import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { dashboardQuerySchema, rangeSchema } from '../../shared/api';
import { query } from '../lib/validate';
import { ctxOf } from '../middleware/session';
import { dashboard, rangeReport } from '../services/reports';

export const reportRoutes = new Hono<AppEnv>()
  .get('/dashboard', async (c) => c.json(await dashboard(ctxOf(c), query(c, dashboardQuerySchema))))
  .get('/reports', async (c) => c.json(await rangeReport(ctxOf(c), query(c, rangeSchema), c.req.query('detail') === '1')));

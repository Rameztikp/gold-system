import {
  computeTotals, sumTotals, weekRange, monthRange, datesInRange, addDays, todayIn,
  type Range, type Totals,
} from '../../shared/domain';
import * as daysRepo from '../repo/days';
import * as linesRepo from '../repo/lines';
import { getBranch } from '../repo/branches';
import { notFound } from '../lib/errors';
import type { Ctx } from './context';

export interface DaySummary {
  id: string;
  date: string;
  status: daysRepo.DayRow['status'];
  totals: Totals;
}

export interface RangeReport {
  range: Range;
  days: DaySummary[];
  totals: Totals;
  lines?: (linesRepo.LineRow & { date: string })[];
}

export async function rangeReport(ctx: Ctx, range: Range, withLines = false): Promise<RangeReport> {
  const days = await daysRepo.listDays(ctx.db, ctx.user.branchId, range);
  const lines = await linesRepo.listLinesForDays(ctx.db, ctx.user.branchId, days.map((d) => d.id));
  const byDay = new Map<string, linesRepo.LineRow[]>();
  for (const l of lines) byDay.set(l.dayId, [...(byDay.get(l.dayId) ?? []), l]);
  const summaries = days.map((d) => ({ id: d.id, date: d.date, status: d.status, totals: computeTotals(byDay.get(d.id) ?? []) }));
  const report: RangeReport = { range, days: summaries, totals: sumTotals(summaries.map((s) => s.totals)) };
  if (withLines) {
    const dateOf = new Map(days.map((d) => [d.id, d.date]));
    report.lines = lines.map((l) => ({ ...l, date: dateOf.get(l.dayId) ?? '' }))
      .sort((a, b) => (a.date === b.date ? a.position - b.position : a.date < b.date ? -1 : 1));
  }
  return report;
}

export async function branchToday(ctx: Ctx): Promise<{ today: string; weekStart: number }> {
  const b = await getBranch(ctx.db, ctx.user.branchId);
  if (!b) throw notFound();
  return { today: todayIn(b.timezone, new Date(ctx.now)), weekStart: b.weekStart };
}

export async function dashboard(ctx: Ctx, q: { period: 'day' | 'week' | 'month'; date: string }) {
  const { weekStart, today } = await branchToday(ctx);
  const range = q.period === 'day' ? { from: q.date, to: q.date } : q.period === 'week' ? weekRange(q.date, weekStart) : monthRange(q.date);
  const report = await rangeReport(ctx, range);
  const byDate = new Map(report.days.map((d) => [d.date, d.totals.salesFils]));
  const series = datesInRange(range).map((date) => ({ date, salesFils: byDate.get(date) ?? 0 }));
  const attention = await daysRepo.listDaysNeedingAttention(ctx.db, ctx.user.branchId, addDays(today, -90));
  return {
    range, today, totals: report.totals, series,
    attention: attention.map((d) => ({ id: d.id, date: d.date, status: d.status })),
  };
}

import { matchesQuery, normalizeArabic, suggestDescriptions } from '../../shared/domain';
import * as linesRepo from '../repo/lines';
import type { Ctx } from './context';

/** البحث بالتطبيع العربي ومن بداية الكلمة. */
export async function searchLines(ctx: Ctx, query: string) {
  const words = normalizeArabic(query).split(' ').filter(Boolean);
  const first = words.sort((a, b) => b.length - a.length)[0];
  if (!first) return [];
  const rows = await linesRepo.searchLines(ctx.db, ctx.user.branchId, first);
  return rows.filter((r) => matchesQuery(r.line.description, query)).slice(0, 200)
    .map((r) => ({ ...r.line, date: r.date }));
}

export async function suggest(ctx: Ctx, input: { kind: linesRepo.LineRow['kind']; q: string }): Promise<string[]> {
  const rows = await linesRepo.recentDescriptions(ctx.db, ctx.user.branchId, input.kind);
  return suggestDescriptions(rows.map((r) => r.d), input.q);
}

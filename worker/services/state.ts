import type { Day } from '../../shared/domain';
import * as ledgerRepo from '../repo/ledger';
import { dayToWire } from '../repo/wire';
import type { SessionUser } from '../env';
import type { Ctx } from './context';
import { getSettings, type BranchView } from './settings';

export interface AppState { me: SessionUser; branch: BranchView; days: Day[] }

/** كل أيام الفرع بسطورها وصورها دفعة واحدة — الواجهة تحسب منها اللوحة والتقارير والبحث كما في النموذج. */
export async function getState(ctx: Ctx): Promise<AppState> {
  const [branch, days, lines, photos] = await Promise.all([
    getSettings(ctx),
    ledgerRepo.listDayRows(ctx.db, ctx.user.branchId),
    ledgerRepo.listLineRows(ctx.db, ctx.user.branchId),
    ledgerRepo.listPhotoRows(ctx.db, ctx.user.branchId),
  ]);
  const byDay = <R extends { dayId: string }>(rows: R[]): Map<string, R[]> => {
    const m = new Map<string, R[]>();
    for (const r of rows) m.set(r.dayId, [...(m.get(r.dayId) ?? []), r]);
    return m;
  };
  const L = byDay(lines);
  const P = byDay(photos);
  return { me: ctx.user, branch, days: days.map((d) => dayToWire(d, L.get(d.id) ?? [], P.get(d.id) ?? [])) };
}

import type { Day } from '../../shared/domain';
import * as ledgerRepo from '../repo/ledger';
import { changedDayDates } from '../repo/audit';
import { dayToWire } from '../repo/wire';
import type { SessionUser } from '../env';
import type { Ctx } from './context';
import { getSettings, type BranchView } from './settings';

/** now: وقت الخادم، الواجهة ترسله في المرة الجاية كـ since. full: كل الأيام أو المتغيّر بس. */
export interface AppState { me: SessionUser; branch: BranchView; days: Day[]; now: number; full: boolean }

/** تداخل بسيط عشان ما يفوت تعديل انكتب وقته قبل ما ينحفظ بلحظات. */
export const SYNC_OVERLAP_MS = 30 * 1000;
const MAX_PARTIAL = 60;

/** بدون since: كل أيام الفرع. مع since: الأيام اللي تغيّرت بعده بس (صغير جدًا مع النت البطيء). */
export async function getState(ctx: Ctx, since?: number): Promise<AppState> {
  const dates = since === undefined ? undefined : await changedDayDates(ctx.db, ctx.user.branchId, since - SYNC_OVERLAP_MS);
  const partial = dates !== undefined && dates.length <= MAX_PARTIAL;
  const branch = await getSettings(ctx);
  if (partial && dates.length === 0) return { me: ctx.user, branch, days: [], now: ctx.now, full: false };
  const days = await ledgerRepo.listDayRows(ctx.db, ctx.user.branchId, partial ? dates : undefined);
  const ids = partial ? days.map((d) => d.id) : undefined;
  if (ids && ids.length === 0) return { me: ctx.user, branch, days: [], now: ctx.now, full: false };
  const [lines, photos] = await Promise.all([
    ledgerRepo.listLineRows(ctx.db, ctx.user.branchId, ids),
    ledgerRepo.listPhotoRows(ctx.db, ctx.user.branchId, ids),
  ]);
  const byDay = <R extends { dayId: string }>(rows: R[]): Map<string, R[]> => {
    const m = new Map<string, R[]>();
    for (const r of rows) m.set(r.dayId, [...(m.get(r.dayId) ?? []), r]);
    return m;
  };
  const L = byDay(lines); const P = byDay(photos);
  return { me: ctx.user, branch, days: days.map((d) => dayToWire(d, L.get(d.id) ?? [], P.get(d.id) ?? [])), now: ctx.now, full: !partial };
}

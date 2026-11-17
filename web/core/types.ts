import type { Totals, CompareItem, DayStatus, LineKind } from '../../shared/domain';

export type { Totals, CompareItem, DayStatus, LineKind };

export interface Me { id: string; branchId: string; name: string; role: 'owner' | 'entry' }

export interface Settings {
  id: string; name: string; currency: string; countryCode: string; timezone: string; weekStart: number; version: number;
}

export interface LineDto {
  id: string; dayId: string; kind: LineKind; position: number; description: string; pieces: number; weightCg: number;
  amountFils: number; wagesFils: number; commissionFils: number; extraFils: number; cancelled: boolean;
  cancelReason: string | null; version: number; date?: string;
}

export interface DayDto {
  id: string; date: string; goldPriceFils: number | null; note: string; status: DayStatus; version: number;
}

export interface DayView { day: DayDto; lines: LineDto[]; photos: { id: string }[]; totals: Totals; compare: CompareItem[] }

export interface DaySummary { id: string; date: string; status: DayStatus; totals: Totals }

export interface RangeReport { range: { from: string; to: string }; days: DaySummary[]; totals: Totals; lines?: LineDto[] }

export interface Dashboard {
  range: { from: string; to: string }; today: string; totals: Totals;
  series: { date: string; salesFils: number }[]; attention: { id: string; date: string; status: DayStatus }[];
}

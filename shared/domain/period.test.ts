import { describe, expect, it } from 'vitest';
import { datesInRange, isValidDate, monthRange, weekRange } from './period';
import { isUuidV7, uuidv7 } from './uuid';

describe('الفترات', () => {
  it('أسبوع يبدأ السبت', () => expect(weekRange('2026-10-14', 6)).toEqual({ from: '2026-10-10', to: '2026-10-16' }));
  it('أسبوع يبدأ الأحد', () => expect(weekRange('2026-10-14', 0)).toEqual({ from: '2026-10-11', to: '2026-10-17' }));
  it('الشهر', () => expect(monthRange('2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' }));
  it('أيام أكتوبر 31', () => expect(datesInRange(monthRange('2026-10-05'))).toHaveLength(31));
  it('تاريخ غير صالح', () => expect(isValidDate('2026-02-30')).toBe(false));
});

describe('UUIDv7', () => {
  it('الصيغة', () => expect(isUuidV7(uuidv7())).toBe(true));
  it('مرتب بالوقت', () => expect(uuidv7(1000) < uuidv7(2000)).toBe(true));
});

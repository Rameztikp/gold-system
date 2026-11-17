import { describe, it, expect } from 'vitest';
import { cleanField, isName, hasLetter } from './fields';

describe('أنواع الخانات', () => {
  it('خانة الأرقام تحذف الحروف وتقبل فاصلة عشرية واحدة', () => {
    expect(cleanField('decimal', '12a.5.0ب')).toBe('12.50');
    expect(cleanField('decimal', '١٢٫٥')).toBe('١٢٫٥');
    expect(cleanField('decimal', '1,234.50')).toBe('1,234.50');
    expect(cleanField('digits', '0x3')).toBe('03');
    expect(cleanField('tel', '+971 50-123abc')).toBe('+971 50123');
  });
  it('خانة الاسم تحذف الأرقام والرموز', () => {
    expect(cleanField('name', 'علي 22@')).toBe('علي ');
    expect(cleanField('name', 'م. علي-حسن')).toBe('م. علي-حسن');
    expect(cleanField('user', 'Yousef 1!')).toBe('yousef1');
  });
  it('التحقق', () => {
    expect(isName('يوسف العمراني')).toBe(true);
    expect(isName('يوسف 2')).toBe(false);
    expect(hasLetter('سبيكة 20 جرام')).toBe(true);
    expect(hasLetter('2000')).toBe(false);
  });
});

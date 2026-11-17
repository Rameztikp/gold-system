import { describe, expect, it } from 'vitest';
import { formatWeight, parseMilli, parseWeight, toCentigrams } from './weight';

describe('الوزن', () => {
  it('الملي برقم واحد أعشار', () => expect(parseMilli('3')).toBe(30));
  it('الملي برقمين أجزاء من مئة', () => expect(parseMilli('03')).toBe(3));
  it('6.25 في خانة الجرام تصير 6 | 25', () => expect(parseWeight('6.25', '')).toEqual({ grams: 6, milli: 25 }));
  it('6.3 في خانة الجرام تصير 6 | 30', () => expect(parseWeight('6.3', '')).toEqual({ grams: 6, milli: 30 }));
  it('الأرقام العربية', () => expect(toCentigrams(parseWeight('١٢', '٥'))).toBe(1250));
  it('خانات فارغة = صفر', () => expect(toCentigrams(parseWeight('', ''))).toBe(0));
  it('العرض', () => expect(formatWeight(114369)).toBe('1,143.69'));
  it('عرض الأجزاء الصغيرة', () => expect(formatWeight(3)).toBe('0.03'));
});

import { describe, expect, it } from 'vitest';
import { matchesQuery, normalizeArabic, suggestDescriptions } from './arabic';

describe('التطبيع العربي', () => {
  it('الهمزات والتاء المربوطة', () => expect(normalizeArabic('إسوارة أحمد')).toBe('اسواره احمد'));
  it('التشكيل والتطويل', () => expect(normalizeArabic('ذَهَـــب')).toBe('ذهب'));
  it('من بداية الكلمة', () => {
    expect(matchesQuery('سلسلة ذهب عيار 21', 'سلس')).toBe(true);
    expect(matchesQuery('سلسلة ذهب', 'لسلة')).toBe(false);
  });
  it('كل الكلمات', () => expect(matchesQuery('خاتم ألماس', 'الم خات')).toBe(true));
  it('الأرقام', () => expect(matchesQuery('عيار 21', '٢١')).toBe(true));
  it('اقتراحات بالأكثر تكرارًا', () => {
    expect(suggestDescriptions(['خاتم', 'خلخال', 'خاتم', 'سلسلة'], 'خ')).toEqual(['خاتم', 'خلخال']);
  });
});

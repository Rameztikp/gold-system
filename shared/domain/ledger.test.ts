import { describe, expect, it } from 'vitest';
import { W, T, weightCg, type Day, type SaleLine } from './ledger';
import { compareLedger, lerrNote, reopen } from './compare';
import { describe as describeLine, diffText, sameLine } from './lines';
import { findWord, normS, parseNum } from './arabic';

const sale = (o: Partial<SaleLine> = {}): SaleLine => ({ id: 'a', d: 'خاتم', g: 6, m: '25', k: '21', mk: 50, p: 1500, ...o });
const day = (o: Partial<Day> = {}): Day => ({
  id: '2026-10-01', buy: 425, sell: null, comm: 30, xl: '', x: null, status: 'open', note: '', ledger: {},
  sales: [sale()], purch: [], exp: [], photos: [], ...o,
});

describe('الوزن', () => {
  it('الملي برقم واحد أعشار', () => expect(W(0, '3')).toBe(0.3));
  it('الملي برقمين أجزاء من مئة', () => expect(W(0, '03')).toBe(0.03));
  it('بلا وزن', () => expect(W(null, '')).toBeNull());
  it('جرام فقط', () => expect(weightCg(7, '')).toBe(700));
});

describe('المجاميع', () => {
  it('إجمالي الأجور = الأجور + العمولة + البند الإضافي', () => expect(T(day({ x: 20 })).tot).toBe(100));
  it('الملغى لا يدخل', () => {
    const t = T(day({ sales: [sale(), sale({ id: 'b', x: { r: 'مكرر', at: 1, who: 'x' } })] }));
    expect([t.sales, t.sn, t.sw]).toEqual([1500, 1, 6.25]);
  });
  it('لا أخطاء كسور', () => expect(T(day({ sales: [sale({ p: 0.1 }), sale({ id: 'b', p: 0.2 })] })).sales).toBe(0.3));
  it('الشراء كسر وجديد', () => {
    const t = T(day({ purch: [{ id: 'p', d: 'ليرة', g: 7, m: '2', a: 3050, t: 'كسر' }, { id: 'q', d: 'جديد', g: 1, m: '', a: 400, t: 'جديد' }] }));
    expect([t.purch, t.pw, t.pk, t.pj, t.pjw]).toEqual([3450, 8.2, 3050, 400, 1]);
  });
});

describe('المقارنة', () => {
  it('الخانة الفارغة لا تُقارن', () => expect(compareLedger(T(day()), {}).filled).toBe(0));
  it('مطابق', () => expect(compareLedger(T(day()), { sales: 1500, sw: 6.25, mk: 50, tot: 80 }).bad).toEqual([]));
  it('فرق فلس واحد', () => expect(compareLedger(T(day()), { sales: 1500.01 }).bad).toHaveLength(1));
  it('نص الملاحظة', () => {
    const { bad } = compareLedger(T(day()), { sw: 6.3 });
    expect(lerrNote(bad)).toBe('وزن المبيعات: 6.30 في الدفتر، و6.25 من السطور. السطور صحيحة، والخطأ في جمع الدفتر.');
  });
  it('إعادة الفتح', () => {
    const d = { status: 'lerr' as const, note: 'x' };
    reopen(d);
    expect(d).toEqual({ status: 'open', note: '' });
  });
});

describe('السطور', () => {
  it('سطر مطابق للسابق', () => expect(sameLine('sales', sale(), sale({ id: 'b', d: 'خاتَم' }))).toBe(true));
  it('سطر مختلف', () => expect(sameLine('sales', sale(), sale({ k: '18' }))).toBe(false));
  it('الوصف', () => expect(describeLine('sales', sale())).toBe('خاتم، 6.25 جم، عيار 21، 1,500.00'));
  it('الفرق', () => expect(diffText('sales', sale(), sale({ m: '30', p: 1600 }))).toBe('الوزن: 6.25 ← 6.30 جم؛ السعر: 1,500.00 ← 1,600.00'));
});

describe('البحث', () => {
  it('التطبيع', () => expect(normS('إسوارة ذَهـب ٢١')).toBe('اسواره ذهب 21'));
  it('من بداية الكلمة', () => expect(findWord(normS('تعليقة'), 'علي')).toBe(-1));
  it('بعد «ال»', () => expect(findWord(normS('الخاتم'), 'خاتم')).toBe(2));
  it('الأرقام', () => expect(parseNum('١٬٢٣٤٫٥')).toBeNaN());
  it('فاصلة عشرية عربية', () => expect(parseNum('١٢٣٤٫٥')).toBe(1234.5));
});

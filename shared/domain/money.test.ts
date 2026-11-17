import { describe, expect, it } from 'vitest';
import { formatAmount, parseAmount } from './money';

describe('المبالغ', () => {
  it('قراءة', () => expect(parseAmount('574,615.00')).toBe(57461500));
  it('كسر واحد', () => expect(parseAmount('12.5')).toBe(1250));
  it('أرقام عربية', () => expect(parseAmount('١٢٠')).toBe(12000));
  it('مدخل خاطئ', () => expect(parseAmount('12.345')).toBeNull());
  it('عرض', () => expect(formatAmount(57461500)).toBe('574,615.00'));
  it('عرض سالب', () => expect(formatAmount(-5)).toBe('-0.05'));
});

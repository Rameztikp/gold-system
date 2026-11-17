import { toLatinDigits } from './weight';

/** المبالغ تُخزَّن بالفلس (1/100 من العملة) كعدد صحيح. */

export function parseAmount(input: string): number | null {
  const clean = toLatinDigits(input.replace(/[\s,٬]/g, '')).trim();
  if (clean === '') return 0;
  if (!/^-?\d*(\.\d{0,2})?$/.test(clean)) return null;
  const negative = clean.startsWith('-');
  const [whole = '0', frac = ''] = clean.replace('-', '').split('.');
  const fils = Number(whole || '0') * 100 + Number(frac.padEnd(2, '0'));
  return negative ? -fils : fils;
}

/** 57461500 → "574,615.00" */
export function formatAmount(fils: number): string {
  const sign = fils < 0 ? '-' : '';
  const abs = Math.abs(fils);
  const whole = Math.trunc(abs / 100).toLocaleString('en-US');
  return `${sign}${whole}.${String(abs % 100).padStart(2, '0')}`;
}

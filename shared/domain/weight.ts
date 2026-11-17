/** الوزن يُخزَّن بأجزاء المئة من الجرام (centigrams) كعدد صحيح. */

export interface WeightParts {
  grams: number;
  milli: number; // 0..99 أجزاء من مئة
}

const digitsOnly = (s: string): string => toLatinDigits(s).replace(/[^0-9]/g, '');

export function toLatinDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫,]/g, '.');
}

/** الملي: رقم واحد = أعشار (3 → 30)، رقمان = أجزاء من مئة (03 → 3). */
export function parseMilli(input: string): number {
  const d = digitsOnly(input).slice(0, 2);
  if (d.length === 0) return 0;
  if (d.length === 1) return Number(d) * 10;
  return Number(d);
}

/** خانة الجرام: «6.25» تصير 6 | 25، و«6.3» تصير 6 | 30. */
export function splitGramsInput(input: string): { grams: string; milli: string | null } {
  const clean = toLatinDigits(input).trim();
  const dot = clean.indexOf('.');
  if (dot < 0) return { grams: digitsOnly(clean), milli: null };
  return { grams: digitsOnly(clean.slice(0, dot)), milli: digitsOnly(clean.slice(dot + 1)) };
}

export function parseWeight(gramsInput: string, milliInput: string): WeightParts {
  const split = splitGramsInput(gramsInput);
  const grams = split.grams === '' ? 0 : Number(split.grams);
  const milli = parseMilli(split.milli ?? milliInput);
  return { grams, milli };
}

export const toCentigrams = (w: WeightParts): number => w.grams * 100 + w.milli;

export function fromCentigrams(cg: number): WeightParts {
  return { grams: Math.trunc(cg / 100), milli: Math.abs(cg % 100) };
}

/** 114369 → "1,143.69" */
export function formatWeight(cg: number): string {
  const sign = cg < 0 ? '-' : '';
  const { grams, milli } = fromCentigrams(Math.abs(cg));
  return `${sign}${grams.toLocaleString('en-US')}.${String(milli).padStart(2, '0')}`;
}

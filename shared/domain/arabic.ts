import { toLatinDigits } from './weight';

const DIACRITICS = /[ً-ٰٟـ]/g;

/** تطبيع عربي للبحث. */
export function normalizeArabic(s: string): string {
  return toLatinDigits(s)
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const words = (s: string): string[] => normalizeArabic(s).split(' ').filter(Boolean);

/** كل كلمة في البحث تطابق بداية كلمة في النص. */
export function matchesQuery(text: string, query: string): boolean {
  const q = words(query);
  if (q.length === 0) return false;
  const t = words(text);
  return q.every((qw) => t.some((tw) => tw.startsWith(qw)));
}

/** اقتراحات للبيان أثناء الكتابة: الأكثر تكرارًا أولًا. */
export function suggestDescriptions(history: readonly string[], prefix: string, limit = 6): string[] {
  if (normalizeArabic(prefix) === '') return [];
  const counts = new Map<string, number>();
  for (const h of history) {
    const v = h.trim();
    if (v && matchesQuery(v, prefix)) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([v]) => v);
}

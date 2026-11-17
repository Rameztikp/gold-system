/** البحث واقتراحات البيان تتجاهل فروق الكتابة الصغيرة: أ/إ/آ وا، ة وه، الحركات، التطويل، الأرقام العربية. (النموذج: normC/normS/findWord) */

export const latin = (s: unknown): string => String(s ?? '')
  .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
  .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

/** رقم من نص المستخدم: أرقام عربية، فاصلة عشرية عربية، فواصل الآلاف. NaN إذا فارغ. */
export function parseNum(v: unknown): number {
  const s = latin(v).trim().replace(/٫/g, '.').replace(/[,،\s]/g, '');
  return s === '' ? NaN : Number(s);
}

const AR_EQ: Record<string, string> = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ة': 'ه' };
/** ملاحظة: في النموذج كان مدى الحركات يشمل الأرقام العربية (٠-٩) فتُحذف؛ هنا تُحوَّل أولًا ثم تُحذف الحركات (D-19). */
export function normC(ch: string): string {
  const c = latin(ch);
  return /[\u064B-\u065F\u0670\u0640]/.test(c) ? '' : (AR_EQ[c] || c).toLowerCase();
}
export const normS = (s: unknown): string => [...String(s ?? '')].map(normC).join('').replace(/\s+/g, ' ').trim();
export const isWordCh = (c: string | undefined): boolean => !!c && /[\p{L}\p{N}]/u.test(c);

/** المطابقة من بداية الكلمة فقط (أو بعد «ال» مباشرة)، فـ«علي» ما تلقى «تعليقة». */
export function findWord(ns: string, qn: string): number {
  if (!qn) return -1;
  for (let i = ns.indexOf(qn); i >= 0; i = ns.indexOf(qn, i + 1)) {
    if (!isWordCh(ns[i - 1])) return i;
    if (i >= 2 && ns.slice(i - 2, i) === 'ال' && !isWordCh(ns[i - 3])) return i;
  }
  return -1;
}

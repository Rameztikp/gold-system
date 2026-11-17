/* نوع كل خانة: أرقام بس، أو حروف بس، أو كلام فيه حرف واحد على الأقل. نفس القاعدة في الشاشة والخادم. */

const DIGITS = '0-9٠-٩۰-۹';

/** أسماء الناس والأنواع والفرع: حروف ومسافات فقط (ونقطة أو شرطة مثل «م. علي»). */
export const NAME_RE = /^[\p{L}\p{M}\s.'-]+$/u;
export const isName = (s: string): boolean => NAME_RE.test(s.trim());

/** البيان وأمثاله: يقبل أرقام داخل الكلام («سبيكة 20 جرام») لكن لازم فيه حرف. */
export const hasLetter = (s: string): boolean => /\p{L}/u.test(s);

export type FieldKind = 'decimal' | 'digits' | 'tel' | 'name' | 'user';

/** ما يُحذف من الخانة أثناء الكتابة حسب نوعها. */
export const STRIP: Record<FieldKind, RegExp> = {
  decimal: new RegExp(`[^${DIGITS}.٫,٬،]`, 'g'),
  digits: new RegExp(`[^${DIGITS}]`, 'g'),
  tel: new RegExp(`[^${DIGITS}+ ]`, 'g'),
  name: /[^\p{L}\p{M}\s.'-]/gu,
  user: /[^a-z0-9._-]/g,
};

/** ينظّف النص حسب نوع الخانة. الفاصلة العشرية تُقبل مرة واحدة فقط. */
export function cleanField(kind: FieldKind, v: string): string {
  let s = (kind === 'user' ? v.toLowerCase() : v).replace(STRIP[kind], '');
  if (kind === 'decimal') {
    const i = s.search(/[.٫]/);
    if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/[.٫]/g, '');
  }
  return s;
}

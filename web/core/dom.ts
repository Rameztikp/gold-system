/** HTML آمن: كل قيمة تُهرَّب إلا إذا كانت Safe. */
export class Safe {
  constructor(readonly value: string) {}
  toString(): string { return this.value; }
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);

type Value = string | number | boolean | null | undefined | Safe | Value[];

function piece(v: Value): string {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Safe) return v.value;
  if (Array.isArray(v)) return v.map(piece).join('');
  return escapeHtml(String(v));
}

export function html(strings: TemplateStringsArray, ...values: Value[]): Safe {
  let out = strings[0] ?? '';
  values.forEach((v, i) => { out += piece(v) + (strings[i + 1] ?? ''); });
  return new Safe(out);
}

export function render(el: Element, content: Safe): void {
  el.innerHTML = content.value;
}

export function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
}

/** ربط حدث بالتفويض: on(root, 'click [data-act=x]', fn) */
export function on<E extends Event>(root: Element, spec: string, fn: (e: E, el: HTMLElement) => void): void {
  const i = spec.indexOf(' ');
  const type = spec.slice(0, i);
  const sel = spec.slice(i + 1);
  root.addEventListener(type, (e) => {
    const target = (e.target as Element | null)?.closest<HTMLElement>(sel);
    if (target && root.contains(target)) fn(e as E, target);
  });
}

export const val = (root: ParentNode, name: string): string =>
  root.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value ?? '';

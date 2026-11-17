import { hasVal, W, type AnyLine, type ExpLine, type PurchLine, type SaleLine, type Sec } from './ledger';
import { g2, money } from './format';
import { normS } from './arabic';

const sameNum = (a: unknown, b: unknown): boolean => (hasVal(a) ? Number(a) : null) === (hasVal(b) ? Number(b) : null);

/** نفس السطر مرتين متتاليتين: سؤال للمستخدم، لا منع (sameLine في النموذج). */
export function sameLine(sec: Sec, a: AnyLine, b: AnyLine): boolean {
  if (normS(a.d) !== normS(b.d)) return false;
  if (sec === 'exp') {
    const x = a as ExpLine; const y = b as ExpLine;
    return sameNum(x.a, y.a) && (x.c || '') === (y.c || '') && (x.emp || '') === (y.emp || '');
  }
  const x = a as SaleLine & PurchLine; const y = b as SaleLine & PurchLine;
  if (W(x.g, x.m) !== W(y.g, y.m)) return false;
  if (sec === 'purch') return sameNum(x.a, y.a) && (x.t || 'كسر') === (y.t || 'كسر');
  return sameNum(x.p, y.p) && sameNum(x.mk, y.mk) && (x.k || '') === (y.k || '');
}

/** وصف السطر بسطر واحد (describe في النموذج) — يُستخدم في السجل وسؤال التكرار. */
export function describe(sec: Sec, l: AnyLine): string {
  if (sec === 'sales') {
    const s = l as SaleLine; const w = W(s.g, s.m);
    return `${s.d}${w !== null ? `، ${g2(w)} جم` : ''}${s.k ? `، عيار ${s.k}` : ''}، ${money(s.p)}`;
  }
  if (sec === 'purch') {
    const p = l as PurchLine;
    return `${p.t === 'جديد' ? 'جديد: ' : ''}${p.d}، ${g2(W(p.g, p.m) || 0)} جم، ${money(p.a)}`;
  }
  const e = l as ExpLine;
  return `${e.d}، ${e.c}${e.emp ? `، ${e.emp}` : ''}، ${money(e.a)}`;
}

type Fmt = (v: unknown) => string;
interface Fld { label: string; x: unknown; y: unknown; fmt?: Fmt }

function fieldDiff(out: string[], f: Fld): void {
  const fmt = f.fmt ?? ((v: unknown) => String(v));
  if (String(f.x ?? '') !== String(f.y ?? '')) out.push(`${f.label}: ${hasVal(f.x) ? fmt(f.x) : '—'} ← ${hasVal(f.y) ? fmt(f.y) : '—'}`);
}

/** ما تغيّر في السطر: «الحقل: قبل ← بعد» (diffText في النموذج). */
export function diffText(sec: Sec, a: AnyLine, b: AnyLine): string {
  const out: string[] = [];
  const A = a as SaleLine & PurchLine & ExpLine; const B = b as SaleLine & PurchLine & ExpLine;
  fieldDiff(out, { label: 'البيان', x: A.d, y: B.d });
  if (sec !== 'exp') {
    const wa = W(A.g, A.m); const wb = W(B.g, B.m);
    if (wa !== wb) out.push(`الوزن: ${wa === null ? '—' : g2(wa)} ← ${wb === null ? '—' : g2(wb)} جم`);
  }
  if (sec === 'sales') {
    fieldDiff(out, { label: 'العيار', x: A.k, y: B.k });
    fieldDiff(out, { label: 'الأجور', x: A.mk, y: B.mk });
    fieldDiff(out, { label: 'السعر', x: A.p, y: B.p, fmt: money });
  }
  if (sec === 'purch') fieldDiff(out, { label: 'النوع', x: A.t, y: B.t });
  if (sec === 'exp') {
    fieldDiff(out, { label: 'النوع', x: A.c, y: B.c });
    fieldDiff(out, { label: 'الموظف', x: A.emp, y: B.emp });
  }
  if (sec !== 'sales') fieldDiff(out, { label: 'المبلغ', x: A.a, y: B.a, fmt: money });
  return out.join('؛ ');
}

export const SEC_ONE: Record<Sec, string> = { sales: 'البيع', purch: 'الشراء', exp: 'المصروف' };

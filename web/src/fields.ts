/* يمنع كتابة نوع غلط في الخانة: خانات المبالغ والأوزان أرقام بس، وخانات الأسماء حروف بس. */
import { cleanField, type FieldKind } from '../../shared/domain';
import { toast } from './ui';

const NAME_FIELDS = new Set(['ownerName', 'branchName', 'nm', 'nn', 'cat']);
const USER_FIELDS = new Set(['username', 'user', 'r_user']);
const MSG: Record<FieldKind, string> = {
  decimal: 'هذي الخانة أرقام بس.', digits: 'هذي الخانة أرقام بس.', tel: 'هذي الخانة رقم جوال بس.',
  name: 'هذي الخانة حروف بس، بدون أرقام.', user: 'اسم الدخول: حروف إنجليزية صغيرة وأرقام بس.',
};

function kindOf(t: HTMLInputElement): FieldKind | null {
  if (t.type === 'tel') return 'tel';
  if (t.inputMode === 'decimal') return 'decimal';
  if (t.inputMode === 'numeric') return 'digits';
  if (USER_FIELDS.has(t.name)) return 'user';
  if (NAME_FIELDS.has(t.name) || (t.name === 'name' && t.form?.dataset.form === 'adduser')) return 'name';
  return null;
}

let lastWarn = 0;
/** يرجّع true إذا انحذف شيء من الخانة. */
export function filterField(t: HTMLInputElement): boolean {
  const kind = kindOf(t); if (!kind) return false;
  const clean = cleanField(kind, t.value); if (clean === t.value) return false;
  const pos = (t.selectionStart ?? t.value.length) - (t.value.length - clean.length);
  t.value = clean;
  try { t.setSelectionRange(Math.max(0, pos), Math.max(0, pos)); } catch { /* بعض الأنواع ما تدعم */ }
  if (Date.now() - lastWarn > 2500) { lastWarn = Date.now(); toast(MSG[kind]); }
  return true;
}

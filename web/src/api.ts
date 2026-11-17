/* الاتصال بالخادم. كل عملية تعديل ترجع اليوم كاملًا، فتُستبدل نسخته في S. */
import type { Day } from '../../shared/domain';
import { applyDay } from './state';

let onLocked: () => void = () => undefined;
export const setOnLocked = (fn: () => void): void => { onLocked = fn; };

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

async function request<R>(method: string, path: string, body?: unknown): Promise<R> {
  let res: Response;
  const bin = body instanceof Blob;
  try {
    res = await fetch(`/api${path}`, {
      method, credentials: 'same-origin',
      headers: body === undefined || bin ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : bin ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
  if (!res.ok) {
    const err = new ApiError(res.status, data.error === 'session_locked' ? 'session_locked' : data.detail ?? data.error ?? 'error');
    if (err.code === 'session_locked') onLocked();
    throw err;
  }
  return data as R;
}

export const api = {
  get: <R>(p: string) => request<R>('GET', p),
  post: <R>(p: string, b: unknown = {}) => request<R>('POST', p, b),
  put: <R>(p: string, b: unknown) => request<R>('PUT', p, b),
};

/** عملية على يوم: ترسل، ثم تحدّث S باليوم الراجع من الخادم. */
export async function dayCall(method: 'post' | 'put', path: string, body: unknown): Promise<Day> {
  const d = method === 'post' ? await api.post<Day>(path, body) : await api.put<Day>(path, body);
  applyDay(d);
  return d;
}

/** رسالة الخطأ للمستخدم بكلام بسيط. */
export function errorText(e: unknown): string {
  if (!(e instanceof ApiError)) return 'صار خطأ. حاول مرة ثانية.';
  if (e.status === 0) return 'ما فيه اتصال بالإنترنت. ما ضاع شيء: جرّب الحفظ مرة ثانية.';
  if (e.status === 409) return 'شخص ثاني عدّل نفس البيانات قبلك. حدّثنا الصفحة، راجعها وجرّب مرة ثانية.';
  if (e.status === 403) return 'ما عندك صلاحية لهذا.';
  if (e.code === 'session_locked') return 'النظام مقفول. افتحه بالبصمة أو كلمة المرور.';
  if (e.status === 401) return 'انتهى الدخول. ادخل مرة ثانية.';
  if (e.status === 413) return 'الصورة كبيرة جدًا.';
  if (e.code === 'not_image') return 'الملف مو صورة.';
  if (e.status === 400) return 'تأكد من القيم المكتوبة.';
  return 'صار خطأ. حاول مرة ثانية.';
}

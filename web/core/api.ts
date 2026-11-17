import { T } from '../texts';

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

async function request<R>(method: string, path: string, body?: unknown): Promise<R> {
  let res: Response;
  try {
    const isBin = body instanceof Blob;
    res = await fetch(`/api${path}`, {
      method, credentials: 'same-origin',
      headers: body === undefined || isBin ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : isBin ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error');
  return data as R;
}

export const api = {
  get: <R>(p: string) => request<R>('GET', p),
  post: <R>(p: string, b: unknown = {}) => request<R>('POST', p, b),
  patch: <R>(p: string, b: unknown) => request<R>('PATCH', p, b),
  put: <R>(p: string, b: unknown) => request<R>('PUT', p, b),
};

export function errorText(e: unknown): string {
  if (!(e instanceof ApiError)) return T.errors.generic;
  if (e.status === 0) return T.errors.network;
  if (e.status === 409) return T.errors.conflict;
  if (e.status === 403) return T.errors.forbidden;
  if (e.status === 413) return T.errors.tooLarge;
  if (e.code === 'not_image') return T.errors.notImage;
  if (e.status === 400) return T.errors.invalid;
  return T.errors.generic;
}

export const qs = (o: object): string =>
  '?' + new URLSearchParams(Object.entries(o as Record<string, string | number>).map(([k, v]) => [k, String(v)])).toString();

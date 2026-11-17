type Handler = (params: Record<string, string>) => void | Promise<void>;
interface Route { pattern: RegExp; keys: string[]; handler: Handler }

const routes: Route[] = [];
let fallback: Handler = () => undefined;

export function route(path: string, handler: Handler): void {
  const keys: string[] = [];
  const pattern = new RegExp('^' + path.replace(/:(\w+)/g, (_m, k: string) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ pattern, keys, handler });
}

export const notFoundRoute = (h: Handler): void => { fallback = h; };

export const currentPath = (): string => location.hash.replace(/^#/, '').split('?')[0] || '/';

export function hashQuery(): URLSearchParams {
  return new URLSearchParams(location.hash.split('?')[1] ?? '');
}

export async function dispatch(): Promise<void> {
  const path = currentPath();
  for (const r of routes) {
    const m = r.pattern.exec(path);
    if (m) {
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1] ?? '')]));
      await r.handler(params);
      return;
    }
  }
  await fallback({});
}

export const go = (path: string): void => { location.hash = path; };

export function startRouter(): void {
  window.addEventListener('hashchange', () => void dispatch());
  void dispatch();
}

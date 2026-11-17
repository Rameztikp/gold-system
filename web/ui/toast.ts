export function toast(message: string, kind: 'ok' | 'error' = 'ok'): void {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), kind === 'error' ? 5000 : 2200);
}

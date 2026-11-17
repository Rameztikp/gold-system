const KEY = 'gold-theme';

function stored(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

/** الداكن هو الافتراضي. */
export function applyTheme(): void {
  document.documentElement.dataset.theme = stored() === 'light' ? 'light' : 'dark';
}

export function toggleTheme(): void {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(KEY, next); } catch { /* التخزين غير متاح */ }
  document.documentElement.dataset.theme = next;
}

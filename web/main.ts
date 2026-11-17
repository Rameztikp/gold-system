import './styles.css';
import { applyTheme } from './core/theme';
import { loadSession, isOwner } from './core/state';
import { api } from './core/api';
import { route, notFoundRoute, startRouter, go } from './core/router';
import { loginScreen, setupScreen } from './screens/login';
import { dashboardScreen } from './screens/dashboard';
import { daysScreen } from './screens/days';
import { dayScreen } from './screens/day';
import { reportsScreen } from './screens/reports';
import { searchScreen } from './screens/search';
import { usersScreen, settingsScreen } from './screens/admin';
import { auditScreen } from './screens/audit';

const ownerOnly = (screen: () => void) => (): void => (isOwner() ? screen() : go('/'));

function registerRoutes(): void {
  route('/', dashboardScreen);
  route('/days', daysScreen);
  route('/day/:id', dayScreen);
  route('/reports', reportsScreen);
  route('/search', searchScreen);
  route('/admin', ownerOnly(usersScreen));
  route('/admin/users', ownerOnly(usersScreen));
  route('/admin/audit', ownerOnly(auditScreen));
  route('/admin/settings', ownerOnly(settingsScreen));
  notFoundRoute(() => go('/'));
}

async function boot(): Promise<void> {
  applyTheme();
  if (await loadSession()) {
    registerRoutes();
    startRouter();
    return;
  }
  const setup = await api.get<{ needed: boolean }>('/auth/setup').catch(() => ({ needed: false }));
  if (setup.needed) setupScreen();
  else loginScreen();
}

void boot();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  void navigator.serviceWorker.register('/sw.js');
}

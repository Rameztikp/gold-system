import { U, ADMIN } from './state';
import { viewDash } from './views/dash';
import { viewReports } from './views/reports';
import { viewSearch } from './views/search';
import { viewEntry } from './views/entry';
import { viewDays } from './views/days';
import { viewLog, viewUsers, viewSettings } from './views/admin';

/** الصفحة الحالية. مدخل البيانات لا يدخل «الإدارة». */
export function page(): string {
  if (U.user !== 'owner' && ADMIN.includes(U.route)) U.route = 'days';
  switch (U.route) {
    case 'dash': return viewDash();
    case 'reports': return viewReports();
    case 'search': return viewSearch();
    case 'entry': return viewEntry();
    case 'log': return viewLog();
    case 'users': return viewUsers();
    case 'settings': return viewSettings();
    default: return viewDays();
  }
}

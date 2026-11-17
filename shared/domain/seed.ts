import type { Day } from './ledger';

/** شكل ملف بيانات النموذج (prototype/data.json). */
export interface SeedDay {
  id: string; gold: number; comm: number | null; xl?: string; x: number | null; status: 'ok' | 'lerr' | 'open'; note?: string;
  ledger: Record<string, number>;
  sales: { d: string; g: number | null; m?: string; k?: string; mk: number | null; p: number }[];
  purch: { d: string; g: number | null; m?: string; a: number }[];
  exp: { d: string; c: string; a: number }[];
  wd: { n: string; a: number }[];
}

/** نفس seed() في النموذج: السحوبات (wd) تصير مصروفات «للموظفين» باسم الموظف، والشراء «كسر». */
export function dayFromSeed(d: SeedDay, nid: () => string): Day {
  return {
    id: d.id, buy: d.gold, sell: null, comm: d.comm, xl: d.xl || '', x: d.x, status: d.status, note: d.note || '',
    ledger: { ...d.ledger },
    sales: d.sales.map((l) => ({ id: nid(), d: l.d, g: l.g, m: l.m || '', k: l.k || '', mk: l.mk, p: l.p })),
    purch: d.purch.map((l) => ({ id: nid(), d: l.d, g: l.g, m: l.m || '', a: l.a, t: 'كسر' as const })),
    exp: [
      ...d.exp.map((l) => ({ id: nid(), d: l.d, c: l.c, emp: '', a: l.a })),
      ...d.wd.map((l) => ({ id: nid(), d: l.n === 'محمد' ? 'مصاريف محمد' : l.n, c: 'للموظفين', emp: l.n, a: l.a })),
    ],
    photos: [],
  };
}

import { api } from './api';
import type { Me, Settings } from './types';

export const state: { me: Me | null; settings: Settings | null } = { me: null, settings: null };

export async function loadSession(): Promise<boolean> {
  try {
    state.me = await api.get<Me>('/auth/me');
    state.settings = await api.get<Settings>('/settings');
    return true;
  } catch {
    state.me = null;
    return false;
  }
}

export const isOwner = (): boolean => state.me?.role === 'owner';

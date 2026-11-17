import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { api } from './api';

export async function loginWithPasskey(): Promise<void> {
  const { challengeId, options } = await api.post<{ challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }>('/auth/login/passkey/options');
  const response = await startAuthentication({ optionsJSON: options });
  await api.post('/auth/login/passkey/verify', { challengeId, response });
}

export async function addPasskey(label: string): Promise<void> {
  const { challengeId, options } = await api.post<{ challengeId: string; options: PublicKeyCredentialCreationOptionsJSON }>('/auth/passkeys/options');
  const response = await startRegistration({ optionsJSON: options });
  await api.post('/auth/passkeys/verify', { challengeId, response, label });
}

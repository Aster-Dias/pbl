import { apiRequest } from './client';
import { PublicKeyRecord } from '../types';
import { PublicKeyStore } from '../crypto/publicKeyStore';

export const keyApi = {
  async fetchActiveKeys(): Promise<PublicKeyRecord[]> {
    const res = await apiRequest<PublicKeyRecord[]>('/api/keys');
    if (res.success && res.data) {
      await PublicKeyStore.savePublicKeys(res.data);
      return res.data;
    }
    return [];
  },

  async fetchKeyById(keyId: string): Promise<PublicKeyRecord | null> {
    const res = await apiRequest<PublicKeyRecord>(`/api/keys/${keyId}`);
    if (res.success && res.data) {
      await PublicKeyStore.savePublicKeys([res.data]);
      return res.data;
    }
    return null;
  },
};

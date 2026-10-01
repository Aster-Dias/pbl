import { PublicKeyRecord } from '../types';

const STORAGE_KEY = '@authentiq_public_keys_v1';

// Preloaded trusted manufacturer public keys for immediate offline verification
export const ROOT_PUBLIC_KEYS: Record<string, PublicKeyRecord> = {
  'AUTHENTIQ-KEY-001': {
    keyId: 'AUTHENTIQ-KEY-001',
    keyVersion: 1,
    algorithm: 'SHA256withECDSA',
    curve: 'secp256r1',
    // Fallback default or will be updated on online sync
    publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7p9KjG624P6wJbQpLqB+45m+a0Vn+12Y4r1Mv1A3p0QzG5K9pQzG5K9pQzG5K9pQzG5K9pQzG5K9pQzG5K9pQ==',
    active: true,
  },
};

export class PublicKeyStore {
  private static cache: Map<string, PublicKeyRecord> = new Map();
  private static initialized = false;

  public static async init(): Promise<void> {
    if (this.initialized) return;

    // Load bundled keys
    Object.values(ROOT_PUBLIC_KEYS).forEach((k) => this.cache.set(k.keyId, k));

    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const list: PublicKeyRecord[] = JSON.parse(stored);
          list.forEach((k) => this.cache.set(k.keyId, k));
        }
      }
    } catch (e) {
      console.warn('Local public key store initialization error:', e);
    }

    this.initialized = true;
  }

  public static async getPublicKey(keyId: string): Promise<PublicKeyRecord | null> {
    await this.init();
    return this.cache.get(keyId) || null;
  }

  public static async savePublicKeys(keys: PublicKeyRecord[]): Promise<void> {
    await this.init();
    keys.forEach((k) => this.cache.set(k.keyId, { ...k, cachedAt: new Date().toISOString() }));

    try {
      if (typeof localStorage !== 'undefined') {
        const list = Array.from(this.cache.values());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Failed to persist public keys:', e);
    }
  }

  public static async getAllKeys(): Promise<PublicKeyRecord[]> {
    await this.init();
    return Array.from(this.cache.values());
  }
}

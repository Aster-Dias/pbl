import { VerificationResult } from '../types';

const HISTORY_KEY = '@authentiq_scan_history_v1';

export class LocalDatabase {
  public static async getScanHistory(): Promise<VerificationResult[]> {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {
      console.warn('Failed to load scan history:', e);
    }
    return [];
  }

  public static async saveScanResult(result: VerificationResult): Promise<void> {
    try {
      const history = await this.getScanHistory();
      // Prepend newest scan
      const updated = [result, ...history.filter((h) => h.timestamp !== result.timestamp)].slice(0, 100);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('Failed to save scan result:', e);
    }
  }

  public static async clearHistory(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(HISTORY_KEY);
      }
    } catch (e) {
      console.warn('Failed to clear history:', e);
    }
  }
}

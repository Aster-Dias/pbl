import { apiRequest } from './client';
import { ScanQueue } from '../storage/scanQueue';
import { networkManager } from '../utils/network';

export interface ScanSubmissionPayload {
  productId: string;
  deviceIdentifierHash?: string;
  timestamp?: string;
  latitude?: number;
  longitude?: number;
  networkStatus?: string;
  verificationResult?: string;
}

export interface ScanSubmissionResponseData {
  productId: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NORMAL' | 'SUSPICIOUS' | 'CLONE_DETECTED';
  riskReason: string;
  totalScans: number;
  uniqueDevices: number;
  lastScannedAt: string;
  cloneWarning: boolean;
}

export const scanApi = {
  async submitScan(payload: ScanSubmissionPayload): Promise<ScanSubmissionResponseData | null> {
    if (!networkManager.isOnline()) {
      // Queue offline
      await ScanQueue.enqueue({
        productId: payload.productId,
        deviceIdentifierHash: payload.deviceIdentifierHash || 'OFFLINE_DEV',
        timestamp: payload.timestamp || new Date().toISOString(),
        latitude: payload.latitude,
        longitude: payload.longitude,
        networkStatus: 'OFFLINE_SYNCED',
        verificationResult: payload.verificationResult || 'VALID',
      });
      return null;
    }

    try {
      const res = await apiRequest<ScanSubmissionResponseData>('/api/scans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        return res.data;
      }
    } catch (e) {
      // Fallback: Queue if network failed during submission
      await ScanQueue.enqueue({
        productId: payload.productId,
        deviceIdentifierHash: payload.deviceIdentifierHash || 'OFFLINE_DEV',
        timestamp: payload.timestamp || new Date().toISOString(),
        latitude: payload.latitude,
        longitude: payload.longitude,
        networkStatus: 'OFFLINE_SYNCED',
        verificationResult: payload.verificationResult || 'VALID',
      });
    }

    return null;
  },

  async syncPendingScans(): Promise<number> {
    if (!networkManager.isOnline()) return 0;
    const queue = await ScanQueue.getPendingQueue();
    if (queue.length === 0) return 0;

    let syncedCount = 0;
    for (const item of queue) {
      try {
        const res = await apiRequest<ScanSubmissionResponseData>('/api/scans', {
          method: 'POST',
          body: JSON.stringify({
            productId: item.productId,
            deviceIdentifierHash: item.deviceIdentifierHash,
            timestamp: item.timestamp,
            latitude: item.latitude,
            longitude: item.longitude,
            networkStatus: item.networkStatus,
            verificationResult: item.verificationResult,
          }),
        });

        if (res.success) {
          await ScanQueue.remove(item.id);
          syncedCount++;
        }
      } catch (e) {
        console.warn('Failed to sync item:', item.id, e);
        break;
      }
    }

    return syncedCount;
  },
};

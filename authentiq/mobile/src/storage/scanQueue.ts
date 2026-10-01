import { ScanQueueItem } from '../types';

const QUEUE_KEY = '@authentiq_pending_scan_queue_v1';

export class ScanQueue {
  public static async getPendingQueue(): Promise<ScanQueueItem[]> {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(QUEUE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {
      console.warn('Failed to load pending scan queue:', e);
    }
    return [];
  }

  public static async enqueue(item: Omit<ScanQueueItem, 'id' | 'synced'>): Promise<ScanQueueItem> {
    const queue = await this.getPendingQueue();
    const newItem: ScanQueueItem = {
      ...item,
      id: 'scan-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      synced: false,
    };
    queue.push(newItem);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (e) {
      console.warn('Failed to persist scan queue:', e);
    }

    return newItem;
  }

  public static async remove(id: string): Promise<void> {
    const queue = await this.getPendingQueue();
    const updated = queue.filter((item) => item.id !== id);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('Failed to remove queue item:', e);
    }
  }

  public static async clear(): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(QUEUE_KEY);
      }
    } catch (e) {
      console.warn('Failed to clear queue:', e);
    }
  }
}

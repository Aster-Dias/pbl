type NetworkListener = (isOnline: boolean) => void;

class NetworkManager {
  private isSimulatedOffline = false;
  private listeners: Set<NetworkListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.notify());
      window.addEventListener('offline', () => this.notify());
    }
  }

  public isOnline(): boolean {
    if (this.isSimulatedOffline) {
      return false;
    }
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  }

  public setSimulatedOffline(offline: boolean) {
    this.isSimulatedOffline = offline;
    this.notify();
  }

  public isSimulatingOffline(): boolean {
    return this.isSimulatedOffline;
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    listener(this.isOnline());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const status = this.isOnline();
    this.listeners.forEach((fn) => fn(status));
  }
}

export const networkManager = new NetworkManager();

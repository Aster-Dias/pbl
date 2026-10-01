export interface QrPayload {
  v: number;
  alg: string;
  kid: string;
  mid: string;
  pid: string;
  name: string;
  brand: string;
  batch: string;
  mfg: string;
  exp: string;
  sig: string;
}

export type VerificationStatus = 'GENUINE' | 'INVALID' | 'SUSPICIOUS_CLONE' | 'UNKNOWN_KEY' | 'OFFLINE_VERIFIED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface VerificationResult {
  status: VerificationStatus;
  cryptographicallyValid: boolean;
  message: string;
  payload: QrPayload | null;
  canonicalPayload: string;
  keyId: string;
  verificationMode: 'OFFLINE' | 'ONLINE' | 'OFFLINE_QUEUED';
  timestamp: string;
  riskLevel?: RiskLevel;
  riskReason?: string;
  totalScans?: number;
  cloneWarning?: boolean;
}

export interface PublicKeyRecord {
  keyId: string;
  manufacturerId?: number;
  keyVersion: number;
  algorithm: string;
  curve: string;
  publicKey: string;
  active: boolean;
  expiresAt?: string;
  cachedAt?: string;
}

export interface ScanQueueItem {
  id: string;
  productId: string;
  deviceIdentifierHash: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  networkStatus: 'OFFLINE_SYNCED';
  verificationResult: string;
  synced: boolean;
}

export interface ProductDetails {
  id?: number;
  productId: string;
  productName: string;
  brand: string;
  category?: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  status: string;
  algorithm?: string;
  keyVersion?: number;
  keyId?: string;
  signature?: string;
  canonicalPayload?: string;
  qrCodeBase64?: string;
  totalScans?: number;
  uniqueDevices?: number;
  riskLevel?: string;
  riskReason?: string;
}

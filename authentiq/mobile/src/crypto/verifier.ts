import { QrPayload, VerificationResult, VerificationStatus } from '../types';
import { buildCanonicalPayload } from './canonicalization';
import { verifySignatureOffline } from './signature';
import { PublicKeyStore } from './publicKeyStore';
import { networkManager } from '../utils/network';
import { keyApi } from '../api/keyApi';
import { scanApi } from '../api/scanApi';
import { LocalDatabase } from '../storage/localDatabase';

export async function processQrScan(qrRawString: string): Promise<VerificationResult> {
  const timestamp = new Date().toISOString();

  // 1. Parse QR JSON
  let payload: QrPayload;
  try {
    payload = JSON.parse(qrRawString.trim());
    if (!payload.pid || !payload.sig || !payload.kid) {
      throw new Error('Missing essential QR fields (pid, sig, kid)');
    }
  } catch (err: any) {
    const failedResult: VerificationResult = {
      status: 'INVALID',
      cryptographicallyValid: false,
      message: 'Malformed or invalid QR code format',
      payload: null,
      canonicalPayload: '',
      keyId: 'UNKNOWN',
      verificationMode: networkManager.isOnline() ? 'ONLINE' : 'OFFLINE',
      timestamp,
      riskLevel: 'CRITICAL',
      riskReason: 'Unparseable QR code data',
    };
    await LocalDatabase.saveScanResult(failedResult);
    return failedResult;
  }

  // 2. Fetch Public Key from local cache
  let keyRecord = await PublicKeyStore.getPublicKey(payload.kid);

  // If not in local cache but online, attempt to fetch and cache it
  if (!keyRecord && networkManager.isOnline()) {
    keyRecord = await keyApi.fetchKeyById(payload.kid);
  }

  // If still not available
  if (!keyRecord || !keyRecord.publicKey) {
    const unknownKeyResult: VerificationResult = {
      status: 'UNKNOWN_KEY',
      cryptographicallyValid: false,
      message: `Signing public key "${payload.kid}" is not cached. Connect to internet to download manufacturer key.`,
      payload,
      canonicalPayload: '',
      keyId: payload.kid,
      verificationMode: networkManager.isOnline() ? 'ONLINE' : 'OFFLINE',
      timestamp,
      riskLevel: 'HIGH',
      riskReason: 'Unknown / missing public key',
    };
    await LocalDatabase.saveScanResult(unknownKeyResult);
    return unknownKeyResult;
  }

  // 3. Reconstruct canonical payload deterministically
  const canonicalPayload = buildCanonicalPayload(payload);

  // 4. Perform pure OFFLINE cryptographic ECDSA verification
  const isSignatureValid = verifySignatureOffline(
    canonicalPayload,
    payload.sig,
    keyRecord.publicKey
  );

  if (!isSignatureValid) {
    // Signature failure
    const invalidResult: VerificationResult = {
      status: 'INVALID',
      cryptographicallyValid: false,
      message: 'VERIFICATION FAILED: Digital signature mismatch. The product data or QR code has been tampered with or forged.',
      payload,
      canonicalPayload,
      keyId: payload.kid,
      verificationMode: networkManager.isOnline() ? 'ONLINE' : 'OFFLINE',
      timestamp,
      riskLevel: 'CRITICAL',
      riskReason: 'Cryptographic signature verification failed',
    };

    // If online, record invalid attempt
    if (networkManager.isOnline()) {
      await scanApi.submitScan({
        productId: payload.pid,
        verificationResult: 'INVALID',
        timestamp,
      });
    }

    await LocalDatabase.saveScanResult(invalidResult);
    return invalidResult;
  }

  // 5. Signature is VALID!
  // Determine if Online Duplicate Check can be performed
  if (networkManager.isOnline()) {
    try {
      const scanResponse = await scanApi.submitScan({
        productId: payload.pid,
        verificationResult: 'VALID',
        timestamp,
        networkStatus: 'ONLINE',
      });

      if (scanResponse) {
        const isClone =
          scanResponse.cloneWarning ||
          scanResponse.status === 'CLONE_DETECTED' ||
          scanResponse.riskLevel === 'HIGH' ||
          scanResponse.riskLevel === 'CRITICAL';

        const result: VerificationResult = {
          status: isClone ? 'SUSPICIOUS_CLONE' : 'GENUINE',
          cryptographicallyValid: true,
          message: isClone
            ? 'SUSPICIOUS PRODUCT: Cryptographic signature is valid, but suspicious duplicate scanning patterns or location anomalies were detected.'
            : 'PRODUCT VERIFIED: Valid digital signature with normal authentic scan history.',
          payload,
          canonicalPayload,
          keyId: payload.kid,
          verificationMode: 'ONLINE',
          timestamp,
          riskLevel: scanResponse.riskLevel,
          riskReason: scanResponse.riskReason,
          totalScans: scanResponse.totalScans,
          cloneWarning: scanResponse.cloneWarning,
        };

        await LocalDatabase.saveScanResult(result);
        return result;
      }
    } catch (e) {
      console.warn('Online duplicate check failed, falling back to offline verified result:', e);
    }
  }

  // Offline Verification Result
  // Queue scan event for later sync
  await scanApi.submitScan({
    productId: payload.pid,
    verificationResult: 'VALID',
    timestamp,
    networkStatus: 'OFFLINE_SYNCED',
  });

  const offlineResult: VerificationResult = {
    status: 'GENUINE',
    cryptographicallyValid: true,
    message: 'PRODUCT VERIFIED (OFFLINE): Digitally signed by manufacturer with valid ECDSA signature. Scan queued for sync.',
    payload,
    canonicalPayload,
    keyId: payload.kid,
    verificationMode: 'OFFLINE',
    timestamp,
    riskLevel: 'LOW',
    riskReason: 'Cryptographically verified offline without backend dependency',
    totalScans: 1,
    cloneWarning: false,
  };

  await LocalDatabase.saveScanResult(offlineResult);
  return offlineResult;
}

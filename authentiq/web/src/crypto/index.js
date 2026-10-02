import { p256 } from '@noble/curves/nist.js';
import { sha256 } from '@noble/hashes/sha2.js';
export { p256, sha256 };

// Helper: Hex <-> Bytes
export function hexToBytes(hex) {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64) {
  const clean = base64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// X.509 SubjectPublicKeyInfo DER header for P-256 (26 bytes)
const X509_P256_HEADER_HEX = '3059301306072a8648ce3d020106082a8648ce3d030107034200';

export function encodeX509PublicKey(uncompressedPubBytes) {
  const header = hexToBytes(X509_P256_HEADER_HEX);
  const combined = new Uint8Array(header.length + uncompressedPubBytes.length);
  combined.set(header, 0);
  combined.set(uncompressedPubBytes, header.length);
  return bytesToBase64(combined);
}

export function buildCanonicalString(v, mid, pid, name, brand, batch, mfg, exp) {
  const sanitize = (val) => (val ? String(val).trim() : '');
  return [
    'AUTHENTIQ',
    v || 1,
    sanitize(mid),
    sanitize(pid),
    sanitize(name),
    sanitize(brand),
    sanitize(batch),
    sanitize(mfg),
    sanitize(exp),
  ].join('|');
}

export function parseSignatureBytes(sigBase64) {
  const bytes = base64ToBytes(sigBase64);
  if (bytes.length === 64) {
    return p256.Signature.fromCompact(bytes);
  }
  if (bytes[0] === 0x30) {
    return p256.Signature.fromDER(bytes);
  }
  return p256.Signature.fromCompact(bytes.slice(0, 64));
}

export function parsePublicKeyBytes(pubKeyBase64OrPem) {
  const clean = pubKeyBase64OrPem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');

  const bytes = base64ToBytes(clean);
  if (bytes.length === 91 && bytes[0] === 0x30) {
    return bytes.slice(26); // Uncompressed point (65 bytes)
  }
  if (bytes.length === 65 || bytes.length === 33) {
    return bytes;
  }
  if (bytes.length > 65 && bytes[bytes.length - 65] === 0x04) {
    return bytes.slice(bytes.length - 65);
  }
  return bytes;
}

export function verifyOfflineEcdsa(canonicalPayload, signatureBase64, publicKeyBase64) {
  try {
    const encoder = new TextEncoder();
    const hash = sha256(encoder.encode(canonicalPayload));
    const sig = parseSignatureBytes(signatureBase64);
    const pubKey = parsePublicKeyBytes(publicKeyBase64);
    return p256.verify(sig, hash, pubKey);
  } catch (e) {
    console.warn('ECDSA verification error:', e);
    return false;
  }
}

export function signWithPrivateKey(canonicalPayload, privateKeyHex) {
  try {
    const encoder = new TextEncoder();
    const hash = sha256(encoder.encode(canonicalPayload));
    const privBytes = hexToBytes(privateKeyHex);
    // In @noble/curves v2.x, p256.sign() returns a raw compact Uint8Array (64 bytes)
    const sigBytes = p256.sign(hash, privBytes);
    return bytesToBase64(sigBytes);
  } catch (e) {
    console.error('Signing error:', e);
    throw new Error('Failed to sign payload with private key: ' + e.message);
  }
}

export function generateECDSAKeypair() {
  const privBytes = p256.utils.randomPrivateKey();
  const privHex = bytesToHex(privBytes);
  const pubBytes = p256.getPublicKey(privBytes, false);
  const pubBase64 = encodeX509PublicKey(pubBytes);
  return { privateKeyHex: privHex, publicKeyBase64: pubBase64 };
}

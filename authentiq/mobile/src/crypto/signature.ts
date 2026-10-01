import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Decodes ASN.1 DER sequence or IEEE P1363 Base64 signature into P-256 Signature instance.
 */
function parseSignature(sigBase64: string) {
  const binaryString = atob(sigBase64.trim());
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Check if it's ASN.1 DER (starts with 0x30 SEQUENCE byte)
  if (bytes[0] === 0x30) {
    try {
      return p256.Signature.fromDER(bytes);
    } catch (e) {
      // Fallback: try raw compact
    }
  }

  // If 64 bytes, treat as raw (r, s)
  if (bytes.length === 64) {
    return p256.Signature.fromCompact(bytes);
  }

  // Otherwise try fromDER as standard
  return p256.Signature.fromDER(bytes);
}

/**
 * Extracts uncompressed public key bytes from X.509 SubjectPublicKeyInfo Base64/PEM or raw point.
 */
function parsePublicKey(pubKeyBase64OrPem: string): Uint8Array {
  const clean = pubKeyBase64OrPem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');

  const binaryString = atob(clean);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // X.509 SubjectPublicKeyInfo for P-256 is 91 bytes long:
  // Sequence (0x30), Algorithm Identifier, EC Parameters, Bit String (0x03 0x42 0x00 0x04 <64 bytes X,Y>)
  if (bytes.length === 91 && bytes[0] === 0x30) {
    // The uncompressed EC point starts at offset 26 (0x04 + 32 bytes X + 32 bytes Y = 65 bytes)
    return bytes.slice(26);
  }

  // If already 65 bytes (0x04 + X + Y) or 33 bytes (compressed)
  if (bytes.length === 65 || bytes.length === 33) {
    return bytes;
  }

  // Search for the 0x04 point prefix with 65 trailing bytes
  if (bytes.length > 65) {
    const pointOffset = bytes.length - 65;
    if (bytes[pointOffset] === 0x04) {
      return bytes.slice(pointOffset);
    }
  }

  return bytes;
}

/**
 * Verifies ECDSA secp256r1 signature against canonical payload completely offline.
 */
export function verifySignatureOffline(
  canonicalPayload: string,
  signatureBase64: string,
  publicKeyBase64OrPem: string
): boolean {
  if (!canonicalPayload || !signatureBase64 || !publicKeyBase64OrPem) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(canonicalPayload);
    const msgHash = sha256(payloadBytes);

    const sig = parseSignature(signatureBase64);
    const pubKeyBytes = parsePublicKey(publicKeyBase64OrPem);

    return p256.verify(sig, msgHash, pubKeyBytes);
  } catch (error) {
    console.warn('[Offline Crypto] Signature verification error:', error);
    return false;
  }
}

import { p256 } from '@noble/curves/p256';
import { sha256 } from '@noble/hashes/sha256';
import assert from 'assert';

console.log('--- Running AuthentiQ Mobile Offline Cryptography Tests ---');

// 1. Generate standard P-256 Keypair
const privKey = p256.utils.randomPrivateKey();
const pubKey = p256.getPublicKey(privKey, false); // uncompressed 65 bytes (0x04 || X || Y)

// Convert pubKey to base64
const pubKeyBase64 = Buffer.from(pubKey).toString('base64');

// 2. Canonical Payload test
const canonicalPayload = 'AUTHENTIQ|1|AUTH001|P000001|Acme Paracetamol|ACME|BATCH001|2026-08-01|2028-08-01';
const msgHash = sha256(new TextEncoder().encode(canonicalPayload));

// 3. Sign using P-256
const signatureObj = p256.sign(msgHash, privKey);
const sigDerBytes = signatureObj.toDERRawBytes();
const sigBase64 = Buffer.from(sigDerBytes).toString('base64');

console.log('Canonical Payload:', canonicalPayload);
console.log('Base64 Signature:', sigBase64);
console.log('Base64 Public Key:', pubKeyBase64);

// 4. Verify original signature offline
const decodedSig = p256.Signature.fromDER(Buffer.from(sigBase64, 'base64'));
const decodedPubKey = Buffer.from(pubKeyBase64, 'base64');
const isValid = p256.verify(decodedSig, msgHash, decodedPubKey);

assert.strictEqual(isValid, true, 'Original signature MUST be valid offline');
console.log('✓ Test 1 Passed: Original ECDSA P-256 signature verified offline');

// 5. Tamper test: Alter product name or batch
const tamperedPayload = 'AUTHENTIQ|1|AUTH001|P000001|Counterfeit Paracetamol|ACME|BATCH001|2026-08-01|2028-08-01';
const tamperedHash = sha256(new TextEncoder().encode(tamperedPayload));
const isTamperValid = p256.verify(decodedSig, tamperedHash, decodedPubKey);

assert.strictEqual(isTamperValid, false, 'Tampered payload MUST strictly fail verification');
console.log('✓ Test 2 Passed: Tampered product name rejected by cryptographic verification');

// 6. Tamper test: Alter batch number
const tamperedBatchPayload = 'AUTHENTIQ|1|AUTH001|P000001|Acme Paracetamol|ACME|BATCH999_FAKED|2026-08-01|2028-08-01';
const tamperedBatchHash = sha256(new TextEncoder().encode(tamperedBatchPayload));
const isTamperBatchValid = p256.verify(decodedSig, tamperedBatchHash, decodedPubKey);

assert.strictEqual(isTamperBatchValid, false, 'Tampered batch MUST strictly fail verification');
console.log('✓ Test 3 Passed: Tampered batch number rejected by cryptographic verification');

console.log('--- All Mobile Crypto Tests Passed Successfully! ---');

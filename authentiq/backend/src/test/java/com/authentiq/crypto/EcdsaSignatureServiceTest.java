package com.authentiq.crypto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;

import static org.junit.jupiter.api.Assertions.*;

class EcdsaSignatureServiceTest {

    private EcdsaSignatureService signatureService;

    @BeforeEach
    void setUp() {
        signatureService = new EcdsaSignatureService();
    }

    @Test
    @DisplayName("Should generate valid secp256r1 KeyPair and verify signature on canonical payload")
    void testSignAndVerifyRoundTrip() {
        KeyPair keyPair = signatureService.generateKeyPair();
        assertNotNull(keyPair.getPrivate());
        assertNotNull(keyPair.getPublic());

        String canonicalPayload = "AUTHENTIQ|1|AUTH001|P000001|Acme Paracetamol|ACME|BATCH001|2026-08-01|2028-08-01";
        String signature = signatureService.sign(canonicalPayload, keyPair.getPrivate());

        assertNotNull(signature);
        assertFalse(signature.isEmpty());

        boolean isValid = signatureService.verify(canonicalPayload, signature, keyPair.getPublic());
        assertTrue(isValid, "Signature must be cryptographically valid for original payload");
    }

    @Test
    @DisplayName("Tampered payload should strictly fail verification")
    void testTamperedPayloadFails() {
        KeyPair keyPair = signatureService.generateKeyPair();
        String originalPayload = "AUTHENTIQ|1|AUTH001|P000001|Acme Paracetamol|ACME|BATCH001|2026-08-01|2028-08-01";
        String signature = signatureService.sign(originalPayload, keyPair.getPrivate());

        // Tampering 1 character in product name or batch
        String tamperedPayload = "AUTHENTIQ|1|AUTH001|P000001|Fake Paracetamol|ACME|BATCH001|2026-08-01|2028-08-01";
        boolean isValid = signatureService.verify(tamperedPayload, signature, keyPair.getPublic());

        assertFalse(isValid, "Tampered payload MUST fail verification");
    }

    @Test
    @DisplayName("Signature verified against wrong public key should fail")
    void testWrongPublicKeyFails() {
        KeyPair keyPair1 = signatureService.generateKeyPair();
        KeyPair keyPair2 = signatureService.generateKeyPair();

        String payload = "AUTHENTIQ|1|AUTH001|P000001|Acme Paracetamol|ACME|BATCH001|2026-08-01|2028-08-01";
        String signature = signatureService.sign(payload, keyPair1.getPrivate());

        boolean isValid = signatureService.verify(payload, signature, keyPair2.getPublic());
        assertFalse(isValid, "Signature checked with wrong public key MUST fail");
    }

    @Test
    @DisplayName("Encoding and decoding X.509 Base64 public key should preserve verification capability")
    void testEncodeDecodePublicKey() {
        KeyPair keyPair = signatureService.generateKeyPair();
        String encodedPub = signatureService.encodePublicKey(keyPair.getPublic());
        assertNotNull(encodedPub);

        String payload = "AUTHENTIQ|1|AUTH001|P000001|Acme Paracetamol|ACME|BATCH001|2026-08-01|2028-08-01";
        String signature = signatureService.sign(payload, keyPair.getPrivate());

        boolean isValid = signatureService.verify(payload, signature, encodedPub);
        assertTrue(isValid, "Encoded/Decoded public key must verify the signature");
    }
}

package com.authentiq.crypto;

import com.authentiq.exception.AuthentiQException;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Service
public class EcdsaSignatureService implements SignatureService {

    private static final Logger logger = LoggerFactory.getLogger(EcdsaSignatureService.class);

    public static final String ALGORITHM = "SHA256withECDSA";
    public static final String CURVE_NAME = "secp256r1";
    public static final String KEY_FACTORY_ALGORITHM = "EC";

    static {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    @Override
    public KeyPair generateKeyPair() {
        try {
            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance(KEY_FACTORY_ALGORITHM);
            ECGenParameterSpec ecSpec = new ECGenParameterSpec(CURVE_NAME);
            keyPairGenerator.initialize(ecSpec, new SecureRandom());
            return keyPairGenerator.generateKeyPair();
        } catch (Exception e) {
            logger.error("Failed to generate ECDSA keypair", e);
            throw new AuthentiQException("ECDSA keypair generation failed: " + e.getMessage(), "KEY_GENERATION_FAILED", e);
        }
    }

    @Override
    public String sign(String canonicalPayload, PrivateKey privateKey) {
        if (canonicalPayload == null || privateKey == null) {
            throw new AuthentiQException("Payload and PrivateKey must not be null", "INVALID_ARGUMENT");
        }
        try {
            Signature ecdsaSign = Signature.getInstance(ALGORITHM);
            ecdsaSign.initSign(privateKey);
            ecdsaSign.update(canonicalPayload.getBytes(StandardCharsets.UTF_8));
            byte[] signatureBytes = ecdsaSign.sign();
            return Base64.getEncoder().encodeToString(signatureBytes);
        } catch (Exception e) {
            logger.error("Failed to sign payload", e);
            throw new AuthentiQException("Digital signing failed: " + e.getMessage(), "SIGNING_FAILED", e);
        }
    }

    @Override
    public boolean verify(String canonicalPayload, String signatureBase64, PublicKey publicKey) {
        if (canonicalPayload == null || signatureBase64 == null || publicKey == null) {
            return false;
        }
        try {
            byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64.trim());
            Signature ecdsaVerify = Signature.getInstance(ALGORITHM);
            ecdsaVerify.initVerify(publicKey);
            ecdsaVerify.update(canonicalPayload.getBytes(StandardCharsets.UTF_8));
            return ecdsaVerify.verify(signatureBytes);
        } catch (Exception e) {
            logger.warn("ECDSA verification evaluation failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public boolean verify(String canonicalPayload, String signatureBase64, String publicKeyBase64) {
        try {
            PublicKey publicKey = decodePublicKey(publicKeyBase64);
            return verify(canonicalPayload, signatureBase64, publicKey);
        } catch (Exception e) {
            logger.warn("Failed to decode public key or verify signature: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public String encodePublicKey(PublicKey publicKey) {
        if (publicKey == null) return null;
        return Base64.getEncoder().encodeToString(publicKey.getEncoded());
    }

    @Override
    public PublicKey decodePublicKey(String publicKeyBase64OrPem) {
        if (publicKeyBase64OrPem == null || publicKeyBase64OrPem.trim().isEmpty()) {
            throw new AuthentiQException("Public key string is empty", "INVALID_KEY");
        }
        try {
            String cleanKey = publicKeyBase64OrPem
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] decoded = Base64.getDecoder().decode(cleanKey);
            X509EncodedKeySpec spec = new X509EncodedKeySpec(decoded);
            KeyFactory kf = KeyFactory.getInstance(KEY_FACTORY_ALGORITHM);
            return kf.generatePublic(spec);
        } catch (Exception e) {
            logger.error("Failed to decode public key", e);
            throw new AuthentiQException("Failed to decode X.509 public key: " + e.getMessage(), "KEY_DECODE_FAILED", e);
        }
    }

    @Override
    public String encodePrivateKey(PrivateKey privateKey) {
        if (privateKey == null) return null;
        return Base64.getEncoder().encodeToString(privateKey.getEncoded());
    }

    @Override
    public PrivateKey decodePrivateKey(String privateKeyBase64OrPem) {
        if (privateKeyBase64OrPem == null || privateKeyBase64OrPem.trim().isEmpty()) {
            throw new AuthentiQException("Private key string is empty", "INVALID_KEY");
        }
        try {
            String cleanKey = privateKeyBase64OrPem
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] decoded = Base64.getDecoder().decode(cleanKey);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decoded);
            KeyFactory kf = KeyFactory.getInstance(KEY_FACTORY_ALGORITHM);
            return kf.generatePrivate(spec);
        } catch (Exception e) {
            logger.error("Failed to decode private key", e);
            throw new AuthentiQException("Failed to decode PKCS#8 private key: " + e.getMessage(), "KEY_DECODE_FAILED", e);
        }
    }
}

package com.authentiq.crypto;

import com.authentiq.entity.PublicKeyRecord;
import com.authentiq.exception.AuthentiQException;
import com.authentiq.exception.ResourceNotFoundException;
import com.authentiq.repository.PublicKeyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class KeyManager {

    private static final Logger logger = LoggerFactory.getLogger(KeyManager.class);

    private final SignatureService signatureService;
    private final PublicKeyRepository publicKeyRepository;

    @Value("${authentiq.crypto.key-id:AUTHENTIQ-KEY-001}")
    private String defaultKeyId;

    @Value("${authentiq.crypto.key-version:1}")
    private int defaultKeyVersion;

    // Secure in-memory storage for manufacturer private keys (keyed by keyId)
    private final Map<String, PrivateKey> privateKeyVault = new ConcurrentHashMap<>();

    public KeyManager(SignatureService signatureService, PublicKeyRepository publicKeyRepository) {
        this.signatureService = signatureService;
        this.publicKeyRepository = publicKeyRepository;
    }

    /**
     * Retrieves or initializes keypair for manufacturer.
     */
    @Transactional
    public PublicKeyRecord getOrCreateActivePublicKey(Long manufacturerId, String orgCode) {
        Optional<PublicKeyRecord> existing = publicKeyRepository.findFirstByManufacturerIdAndActiveTrueOrderByKeyVersionDesc(manufacturerId);
        if (existing.isPresent()) {
            PublicKeyRecord record = existing.get();
            if (privateKeyVault.containsKey(record.getKeyId())) {
                return record;
            }
        }

        // Generate new key pair
        return generateNewKeyPairForManufacturer(manufacturerId, orgCode);
    }

    @Transactional
    public PublicKeyRecord generateNewKeyPairForManufacturer(Long manufacturerId, String orgCode) {
        // Deactivate older keys if rotating
        publicKeyRepository.findByManufacturerId(manufacturerId).forEach(k -> {
            k.setActive(false);
            publicKeyRepository.save(k);
        });

        int nextVersion = 1;
        Optional<PublicKeyRecord> lastKey = publicKeyRepository.findFirstByManufacturerIdAndActiveTrueOrderByKeyVersionDesc(manufacturerId);
        if (lastKey.isPresent()) {
            nextVersion = lastKey.get().getKeyVersion() + 1;
        }

        KeyPair kp = signatureService.generateKeyPair();
        String keyId = (orgCode != null ? orgCode : "AUTH") + "-KEY-" + String.format("%03d", nextVersion);

        // Store private key in memory vault
        privateKeyVault.put(keyId, kp.getPrivate());

        String encodedPubKey = signatureService.encodePublicKey(kp.getPublic());
        PublicKeyRecord record = new PublicKeyRecord(
                manufacturerId,
                keyId,
                nextVersion,
                EcdsaSignatureService.ALGORITHM,
                EcdsaSignatureService.CURVE_NAME,
                encodedPubKey,
                true,
                LocalDateTime.now().plusYears(5)
        );

        return publicKeyRepository.save(record);
    }

    public PrivateKey getPrivateKey(String keyId) {
        PrivateKey key = privateKeyVault.get(keyId);
        if (key == null) {
            // Check if we can fallback to default key pair for testing / seed initialization
            logger.warn("Private key for keyId {} not found in memory vault", keyId);
            throw new AuthentiQException("Private key for keyId " + keyId + " is not loaded in backend vault", "KEY_NOT_FOUND");
        }
        return key;
    }

    public void registerInMemoryPrivateKey(String keyId, PrivateKey privateKey) {
        privateKeyVault.put(keyId, privateKey);
    }

    public PublicKey getPublicKey(String keyId) {
        PublicKeyRecord record = publicKeyRepository.findByKeyId(keyId)
                .orElseThrow(() -> new ResourceNotFoundException("Public key with keyId " + keyId + " not found"));
        return signatureService.decodePublicKey(record.getPublicKey());
    }

    public String signWithKeyId(String keyId, String canonicalPayload) {
        PrivateKey privateKey = getPrivateKey(keyId);
        return signatureService.sign(canonicalPayload, privateKey);
    }

    public boolean verifyWithKeyId(String keyId, String canonicalPayload, String signatureBase64) {
        Optional<PublicKeyRecord> recordOpt = publicKeyRepository.findByKeyId(keyId);
        if (recordOpt.isEmpty()) {
            logger.warn("Verification requested for unknown keyId: {}", keyId);
            return false;
        }
        PublicKey publicKey = signatureService.decodePublicKey(recordOpt.get().getPublicKey());
        return signatureService.verify(canonicalPayload, signatureBase64, publicKey);
    }
}

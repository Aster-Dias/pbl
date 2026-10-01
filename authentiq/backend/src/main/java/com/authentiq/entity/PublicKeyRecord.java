package com.authentiq.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "public_keys", indexes = {
    @Index(name = "idx_pk_key_id", columnList = "keyId", unique = true),
    @Index(name = "idx_pk_mfg_id", columnList = "manufacturerId")
})
public class PublicKeyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long manufacturerId;

    @Column(nullable = false, unique = true, length = 64)
    private String keyId;

    @Column(nullable = false)
    private Integer keyVersion = 1;

    @Column(nullable = false, length = 32)
    private String algorithm = "SHA256withECDSA";

    @Column(nullable = false, length = 32)
    private String curve = "secp256r1";

    @Column(nullable = false, columnDefinition = "TEXT")
    private String publicKey;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime expiresAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public PublicKeyRecord() {}

    public PublicKeyRecord(Long manufacturerId, String keyId, Integer keyVersion, String algorithm, String curve, String publicKey, Boolean active, LocalDateTime expiresAt) {
        this.manufacturerId = manufacturerId;
        this.keyId = keyId;
        this.keyVersion = keyVersion;
        this.algorithm = algorithm;
        this.curve = curve;
        this.publicKey = publicKey;
        this.active = active;
        this.expiresAt = expiresAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getManufacturerId() { return manufacturerId; }
    public void setManufacturerId(Long manufacturerId) { this.manufacturerId = manufacturerId; }

    public String getKeyId() { return keyId; }
    public void setKeyId(String keyId) { this.keyId = keyId; }

    public Integer getKeyVersion() { return keyVersion; }
    public void setKeyVersion(Integer keyVersion) { this.keyVersion = keyVersion; }

    public String getAlgorithm() { return algorithm; }
    public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }

    public String getCurve() { return curve; }
    public void setCurve(String curve) { this.curve = curve; }

    public String getPublicKey() { return publicKey; }
    public void setPublicKey(String publicKey) { this.publicKey = publicKey; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}

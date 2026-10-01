package com.authentiq.dto;

import java.time.LocalDateTime;

public class PublicKeyDto {

    private String keyId;
    private Long manufacturerId;
    private Integer keyVersion;
    private String algorithm;
    private String curve;
    private String publicKey;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;

    public PublicKeyDto() {}

    public PublicKeyDto(String keyId, Long manufacturerId, Integer keyVersion, String algorithm, String curve, String publicKey, Boolean active, LocalDateTime createdAt, LocalDateTime expiresAt) {
        this.keyId = keyId;
        this.manufacturerId = manufacturerId;
        this.keyVersion = keyVersion;
        this.algorithm = algorithm;
        this.curve = curve;
        this.publicKey = publicKey;
        this.active = active;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public String getKeyId() { return keyId; }
    public void setKeyId(String keyId) { this.keyId = keyId; }

    public Long getManufacturerId() { return manufacturerId; }
    public void setManufacturerId(Long manufacturerId) { this.manufacturerId = manufacturerId; }

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
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}

package com.authentiq.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_signatures", indexes = {
    @Index(name = "idx_sig_pid", columnList = "productId", unique = true)
})
public class ProductSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String productId;

    @Column(nullable = false, length = 32)
    private String algorithm = "ES256";

    @Column(nullable = false)
    private Integer keyVersion = 1;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String canonicalPayload;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String signature;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public ProductSignature() {}

    public ProductSignature(String productId, String algorithm, Integer keyVersion, String canonicalPayload, String signature) {
        this.productId = productId;
        this.algorithm = algorithm;
        this.keyVersion = keyVersion;
        this.canonicalPayload = canonicalPayload;
        this.signature = signature;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getAlgorithm() { return algorithm; }
    public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }

    public Integer getKeyVersion() { return keyVersion; }
    public void setKeyVersion(Integer keyVersion) { this.keyVersion = keyVersion; }

    public String getCanonicalPayload() { return canonicalPayload; }
    public void setCanonicalPayload(String canonicalPayload) { this.canonicalPayload = canonicalPayload; }

    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = signature; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}

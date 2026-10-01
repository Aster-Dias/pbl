package com.authentiq.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class ProductDetailResponse {

    private Long id;
    private String productId;
    private String productName;
    private String brand;
    private String category;
    private String batchNumber;
    private LocalDate manufacturingDate;
    private LocalDate expiryDate;
    private String status;
    
    // Crypto Details
    private String algorithm;
    private Integer keyVersion;
    private String keyId;
    private String signature;
    private String canonicalPayload;
    private String qrCodeBase64;
    private QrPayloadDto qrPayload;

    // Scan & Risk Summary
    private Integer totalScans;
    private Integer uniqueDevices;
    private LocalDateTime lastScannedAt;
    private String riskLevel;
    private String riskReason;
    private String summaryStatus;

    // Scan History
    private List<ScanEventDto> recentScans;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ProductDetailResponse() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public LocalDate getManufacturingDate() { return manufacturingDate; }
    public void setManufacturingDate(LocalDate manufacturingDate) { this.manufacturingDate = manufacturingDate; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAlgorithm() { return algorithm; }
    public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }

    public Integer getKeyVersion() { return keyVersion; }
    public void setKeyVersion(Integer keyVersion) { this.keyVersion = keyVersion; }

    public String getKeyId() { return keyId; }
    public void setKeyId(String keyId) { this.keyId = keyId; }

    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = signature; }

    public String getCanonicalPayload() { return canonicalPayload; }
    public void setCanonicalPayload(String canonicalPayload) { this.canonicalPayload = canonicalPayload; }

    public String getQrCodeBase64() { return qrCodeBase64; }
    public void setQrCodeBase64(String qrCodeBase64) { this.qrCodeBase64 = qrCodeBase64; }

    public QrPayloadDto getQrPayload() { return qrPayload; }
    public void setQrPayload(QrPayloadDto qrPayload) { this.qrPayload = qrPayload; }

    public Integer getTotalScans() { return totalScans; }
    public void setTotalScans(Integer totalScans) { this.totalScans = totalScans; }

    public Integer getUniqueDevices() { return uniqueDevices; }
    public void setUniqueDevices(Integer uniqueDevices) { this.uniqueDevices = uniqueDevices; }

    public LocalDateTime getLastScannedAt() { return lastScannedAt; }
    public void setLastScannedAt(LocalDateTime lastScannedAt) { this.lastScannedAt = lastScannedAt; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getRiskReason() { return riskReason; }
    public void setRiskReason(String riskReason) { this.riskReason = riskReason; }

    public String getSummaryStatus() { return summaryStatus; }
    public void setSummaryStatus(String summaryStatus) { this.summaryStatus = summaryStatus; }

    public List<ScanEventDto> getRecentScans() { return recentScans; }
    public void setRecentScans(List<ScanEventDto> recentScans) { this.recentScans = recentScans; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

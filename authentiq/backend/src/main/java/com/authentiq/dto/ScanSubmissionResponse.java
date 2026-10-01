package com.authentiq.dto;

import java.time.LocalDateTime;

public class ScanSubmissionResponse {

    private String productId;
    private String riskLevel; // LOW, MEDIUM, HIGH, CRITICAL
    private String status; // NORMAL, SUSPICIOUS, CLONE_DETECTED
    private String riskReason;
    private Integer totalScans;
    private Integer uniqueDevices;
    private LocalDateTime lastScannedAt;
    private boolean cloneWarning;

    public ScanSubmissionResponse() {}

    public ScanSubmissionResponse(String productId, String riskLevel, String status, String riskReason, Integer totalScans, Integer uniqueDevices, LocalDateTime lastScannedAt, boolean cloneWarning) {
        this.productId = productId;
        this.riskLevel = riskLevel;
        this.status = status;
        this.riskReason = riskReason;
        this.totalScans = totalScans;
        this.uniqueDevices = uniqueDevices;
        this.lastScannedAt = lastScannedAt;
        this.cloneWarning = cloneWarning;
    }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRiskReason() { return riskReason; }
    public void setRiskReason(String riskReason) { this.riskReason = riskReason; }

    public Integer getTotalScans() { return totalScans; }
    public void setTotalScans(Integer totalScans) { this.totalScans = totalScans; }

    public Integer getUniqueDevices() { return uniqueDevices; }
    public void setUniqueDevices(Integer uniqueDevices) { this.uniqueDevices = uniqueDevices; }

    public LocalDateTime getLastScannedAt() { return lastScannedAt; }
    public void setLastScannedAt(LocalDateTime lastScannedAt) { this.lastScannedAt = lastScannedAt; }

    public boolean isCloneWarning() { return cloneWarning; }
    public void setCloneWarning(boolean cloneWarning) { this.cloneWarning = cloneWarning; }
}

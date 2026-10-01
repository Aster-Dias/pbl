package com.authentiq.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "scan_summaries", indexes = {
    @Index(name = "idx_summary_pid", columnList = "productId", unique = true),
    @Index(name = "idx_summary_risk", columnList = "riskLevel")
})
public class ScanSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String productId;

    @Column(nullable = false)
    private Integer totalScans = 0;

    @Column(nullable = false)
    private Integer uniqueDevices = 0;

    @Column
    private LocalDateTime lastScannedAt;

    @Column(nullable = false, length = 20)
    private String riskLevel = "LOW"; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(nullable = false, length = 30)
    private String status = "NORMAL"; // NORMAL, SUSPICIOUS, CLONE_DETECTED

    @Column(length = 255)
    private String riskReason = "Initial status";

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onSave() {
        this.updatedAt = LocalDateTime.now();
    }

    public ScanSummary() {}

    public ScanSummary(String productId) {
        this.productId = productId;
        this.totalScans = 0;
        this.uniqueDevices = 0;
        this.riskLevel = "LOW";
        this.status = "NORMAL";
        this.riskReason = "New product, no scans yet";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public Integer getTotalScans() { return totalScans; }
    public void setTotalScans(Integer totalScans) { this.totalScans = totalScans; }

    public Integer getUniqueDevices() { return uniqueDevices; }
    public void setUniqueDevices(Integer uniqueDevices) { this.uniqueDevices = uniqueDevices; }

    public LocalDateTime getLastScannedAt() { return lastScannedAt; }
    public void setLastScannedAt(LocalDateTime lastScannedAt) { this.lastScannedAt = lastScannedAt; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRiskReason() { return riskReason; }
    public void setRiskReason(String riskReason) { this.riskReason = riskReason; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
}

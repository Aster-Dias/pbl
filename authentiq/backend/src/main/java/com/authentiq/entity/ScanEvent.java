package com.authentiq.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "scan_events", indexes = {
    @Index(name = "idx_scan_pid", columnList = "productId"),
    @Index(name = "idx_scan_timestamp", columnList = "timestamp"),
    @Index(name = "idx_scan_device", columnList = "deviceIdentifierHash")
})
public class ScanEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String productId;

    @Column(nullable = false, length = 64)
    private String deviceIdentifierHash;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(nullable = false, length = 20)
    private String networkStatus = "ONLINE"; // ONLINE, OFFLINE_SYNCED

    @Column(nullable = false, length = 30)
    private String verificationResult = "VALID"; // VALID, INVALID, UNKNOWN_KEY

    @Column(length = 64)
    private String ipHash;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.timestamp == null) {
            this.timestamp = LocalDateTime.now();
        }
    }

    public ScanEvent() {}

    public ScanEvent(String productId, String deviceIdentifierHash, LocalDateTime timestamp, Double latitude, Double longitude, String networkStatus, String verificationResult, String ipHash) {
        this.productId = productId;
        this.deviceIdentifierHash = deviceIdentifierHash;
        this.timestamp = timestamp;
        this.latitude = latitude;
        this.longitude = longitude;
        this.networkStatus = networkStatus;
        this.verificationResult = verificationResult;
        this.ipHash = ipHash;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProductId() { return productId; }
    public void setProductId(String productId) { this.productId = productId; }

    public String getDeviceIdentifierHash() { return deviceIdentifierHash; }
    public void setDeviceIdentifierHash(String deviceIdentifierHash) { this.deviceIdentifierHash = deviceIdentifierHash; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getNetworkStatus() { return networkStatus; }
    public void setNetworkStatus(String networkStatus) { this.networkStatus = networkStatus; }

    public String getVerificationResult() { return verificationResult; }
    public void setVerificationResult(String verificationResult) { this.verificationResult = verificationResult; }

    public String getIpHash() { return ipHash; }
    public void setIpHash(String ipHash) { this.ipHash = ipHash; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}

package com.authentiq.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

public class ScanSubmissionRequest {

    @NotBlank(message = "Product ID is required")
    private String productId;

    private String deviceIdentifierHash;
    private LocalDateTime timestamp;
    private Double latitude;
    private Double longitude;
    private String networkStatus = "ONLINE"; // ONLINE or OFFLINE_SYNCED
    private String verificationResult = "VALID"; // VALID, INVALID, UNKNOWN_KEY

    public ScanSubmissionRequest() {}

    public ScanSubmissionRequest(String productId, String deviceIdentifierHash, LocalDateTime timestamp, Double latitude, Double longitude, String networkStatus, String verificationResult) {
        this.productId = productId;
        this.deviceIdentifierHash = deviceIdentifierHash;
        this.timestamp = timestamp;
        this.latitude = latitude;
        this.longitude = longitude;
        this.networkStatus = networkStatus;
        this.verificationResult = verificationResult;
    }

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
}

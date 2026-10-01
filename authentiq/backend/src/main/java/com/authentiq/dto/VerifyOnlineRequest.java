package com.authentiq.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

public class VerifyOnlineRequest {

    @NotBlank(message = "QR Payload string or compact JSON is required")
    private String qrData;

    private String deviceIdentifierHash;
    private Double latitude;
    private Double longitude;
    private LocalDateTime timestamp;

    public VerifyOnlineRequest() {}

    public VerifyOnlineRequest(String qrData, String deviceIdentifierHash, Double latitude, Double longitude, LocalDateTime timestamp) {
        this.qrData = qrData;
        this.deviceIdentifierHash = deviceIdentifierHash;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timestamp = timestamp;
    }

    public String getQrData() { return qrData; }
    public void setQrData(String qrData) { this.qrData = qrData; }

    public String getDeviceIdentifierHash() { return deviceIdentifierHash; }
    public void setDeviceIdentifierHash(String deviceIdentifierHash) { this.deviceIdentifierHash = deviceIdentifierHash; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}

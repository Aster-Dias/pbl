package com.authentiq.dto;

public class VerifyOnlineResponse {

    private boolean cryptographicallyValid;
    private String verificationStatus; // GENUINE, INVALID, SUSPICIOUS_CLONE
    private String message;
    private QrPayloadDto payload;
    private String canonicalPayload;
    private String keyId;
    private String riskLevel;
    private String riskReason;
    private Integer totalScans;
    private boolean cloneWarning;

    public VerifyOnlineResponse() {}

    public boolean isCryptographicallyValid() { return cryptographicallyValid; }
    public void setCryptographicallyValid(boolean cryptographicallyValid) { this.cryptographicallyValid = cryptographicallyValid; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public QrPayloadDto getPayload() { return payload; }
    public void setPayload(QrPayloadDto payload) { this.payload = payload; }

    public String getCanonicalPayload() { return canonicalPayload; }
    public void setCanonicalPayload(String canonicalPayload) { this.canonicalPayload = canonicalPayload; }

    public String getKeyId() { return keyId; }
    public void setKeyId(String keyId) { this.keyId = keyId; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getRiskReason() { return riskReason; }
    public void setRiskReason(String riskReason) { this.riskReason = riskReason; }

    public Integer getTotalScans() { return totalScans; }
    public void setTotalScans(Integer totalScans) { this.totalScans = totalScans; }

    public boolean isCloneWarning() { return cloneWarning; }
    public void setCloneWarning(boolean cloneWarning) { this.cloneWarning = cloneWarning; }
}

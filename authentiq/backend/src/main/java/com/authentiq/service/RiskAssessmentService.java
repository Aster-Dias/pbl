package com.authentiq.service;

import com.authentiq.entity.Product;
import com.authentiq.entity.ScanEvent;
import com.authentiq.entity.ScanSummary;
import com.authentiq.repository.ScanEventRepository;
import com.authentiq.repository.ScanSummaryRepository;
import com.authentiq.util.GeoUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class RiskAssessmentService {

    private static final Logger logger = LoggerFactory.getLogger(RiskAssessmentService.class);

    private final ScanEventRepository scanEventRepository;
    private final ScanSummaryRepository scanSummaryRepository;

    @Value("${authentiq.risk.max-normal-scans:3}")
    private int maxNormalScans;

    @Value("${authentiq.risk.high-scan-threshold:8}")
    private int highScanThreshold;

    @Value("${authentiq.risk.max-unique-devices:2}")
    private int maxUniqueDevices;

    @Value("${authentiq.risk.geo-velocity-kmh-limit:800.0}")
    private double geoVelocityLimitKmh;

    public RiskAssessmentService(ScanEventRepository scanEventRepository, ScanSummaryRepository scanSummaryRepository) {
        this.scanEventRepository = scanEventRepository;
        this.scanSummaryRepository = scanSummaryRepository;
    }

    public static class RiskAssessmentResult {
        private final String riskLevel;
        private final String status;
        private final String riskReason;
        private final boolean cloneWarning;

        public RiskAssessmentResult(String riskLevel, String status, String riskReason, boolean cloneWarning) {
            this.riskLevel = riskLevel;
            this.status = status;
            this.riskReason = riskReason;
            this.cloneWarning = cloneWarning;
        }

        public String getRiskLevel() { return riskLevel; }
        public String getStatus() { return status; }
        public String getRiskReason() { return riskReason; }
        public boolean isCloneWarning() { return cloneWarning; }
    }

    /**
     * Assesses risk for a product considering existing scan history and new scan event.
     */
    public RiskAssessmentResult assess(Product product, ScanEvent newEvent, List<ScanEvent> historicalScans) {
        String productId = product.getProductId();

        // Check 1: Cryptographic verification failure recorded in event
        if ("INVALID".equalsIgnoreCase(newEvent.getVerificationResult())) {
            return new RiskAssessmentResult("CRITICAL", "SUSPICIOUS", "Digital signature verification failed on device", false);
        }

        // Total scans count including this one
        int totalScans = historicalScans.size() + 1;

        // Unique devices count
        long uniqueDevices = historicalScans.stream()
                .map(ScanEvent::getDeviceIdentifierHash)
                .distinct()
                .count();
        if (newEvent.getDeviceIdentifierHash() != null && historicalScans.stream().noneMatch(s -> s.getDeviceIdentifierHash().equals(newEvent.getDeviceIdentifierHash()))) {
            uniqueDevices++;
        }

        // Check 2: Geo-velocity impossible travel anomaly
        if (newEvent.getLatitude() != null && newEvent.getLongitude() != null) {
            for (ScanEvent prev : historicalScans) {
                if (prev.getLatitude() != null && prev.getLongitude() != null) {
                    double speedKmh = GeoUtil.calculateVelocityKmh(
                            prev.getLatitude(), prev.getLongitude(), prev.getTimestamp(),
                            newEvent.getLatitude(), newEvent.getLongitude(), newEvent.getTimestamp()
                    );
                    double distanceKm = GeoUtil.calculateDistanceKm(
                            prev.getLatitude(), prev.getLongitude(),
                            newEvent.getLatitude(), newEvent.getLongitude()
                    );

                    if (speedKmh > geoVelocityLimitKmh && distanceKm > 50.0) {
                        logger.warn("Geo-velocity anomaly detected for product {}: {} km/h over {} km", productId, speedKmh, distanceKm);
                        return new RiskAssessmentResult(
                                "CRITICAL",
                                "CLONE_DETECTED",
                                String.format("Impossible travel velocity: %.0f km/h between locations (%.0f km apart)", speedKmh, distanceKm),
                                true
                        );
                    }
                }
            }
        }

        // Check 3: Multi-device proliferation anomaly
        if (uniqueDevices > maxUniqueDevices) {
            return new RiskAssessmentResult(
                    "HIGH",
                    "CLONE_DETECTED",
                    String.format("Product QR scanned across %d different devices (Threshold: %d)", uniqueDevices, maxUniqueDevices),
                    true
            );
        }

        // Check 4: Rapid high-frequency burst scans (e.g. 4+ scans in past 10 minutes)
        LocalDateTime tenMinsAgo = newEvent.getTimestamp().minusMinutes(10);
        long burstCount = historicalScans.stream()
                .filter(s -> s.getTimestamp() != null && s.getTimestamp().isAfter(tenMinsAgo))
                .count();

        if (burstCount >= 3) {
            return new RiskAssessmentResult(
                    "HIGH",
                    "SUSPICIOUS",
                    String.format("Rapid scan burst detected: %d scans within 10 minutes", burstCount + 1),
                    true
            );
        }

        // Check 5: Total scan threshold
        if (totalScans >= highScanThreshold) {
            return new RiskAssessmentResult(
                    "HIGH",
                    "SUSPICIOUS",
                    String.format("Abnormally high scan frequency: %d total scans", totalScans),
                    true
            );
        } else if (totalScans > maxNormalScans) {
            return new RiskAssessmentResult(
                    "MEDIUM",
                    "SUSPICIOUS",
                    String.format("Multiple scans observed (%d scans)", totalScans),
                    false
            );
        }

        // Normal verification
        return new RiskAssessmentResult(
                "LOW",
                "NORMAL",
                "Cryptographically verified with normal scan history",
                false
        );
    }
}

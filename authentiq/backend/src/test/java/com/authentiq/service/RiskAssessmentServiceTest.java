package com.authentiq.service;

import com.authentiq.entity.Product;
import com.authentiq.entity.ScanEvent;
import com.authentiq.repository.ScanEventRepository;
import com.authentiq.repository.ScanSummaryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RiskAssessmentServiceTest {

    private RiskAssessmentService riskAssessmentService;
    private ScanEventRepository scanEventRepository;
    private ScanSummaryRepository scanSummaryRepository;

    @BeforeEach
    void setUp() {
        scanEventRepository = Mockito.mock(ScanEventRepository.class);
        scanSummaryRepository = Mockito.mock(ScanSummaryRepository.class);
        riskAssessmentService = new RiskAssessmentService(scanEventRepository, scanSummaryRepository);

        ReflectionTestUtils.setField(riskAssessmentService, "maxNormalScans", 3);
        ReflectionTestUtils.setField(riskAssessmentService, "highScanThreshold", 8);
        ReflectionTestUtils.setField(riskAssessmentService, "maxUniqueDevices", 2);
        ReflectionTestUtils.setField(riskAssessmentService, "geoVelocityLimitKmh", 800.0);
    }

    @Test
    @DisplayName("Single scan from single device should result in LOW risk")
    void testNormalScanLowRisk() {
        Product product = new Product();
        product.setProductId("P000001");

        ScanEvent event = new ScanEvent("P000001", "DEV-001", LocalDateTime.now(), 37.7749, -122.4194, "ONLINE", "VALID", "IPHASH1");
        List<ScanEvent> history = new ArrayList<>();

        RiskAssessmentService.RiskAssessmentResult result = riskAssessmentService.assess(product, event, history);

        assertEquals("LOW", result.getRiskLevel());
        assertEquals("NORMAL", result.getStatus());
        assertFalse(result.isCloneWarning());
    }

    @Test
    @DisplayName("Impossible geo-velocity (e.g. SF to London in 5 minutes) should trigger CRITICAL / CLONE_DETECTED")
    void testImpossibleTravelVelocityTriggersCloneWarning() {
        Product product = new Product();
        product.setProductId("P000001");

        LocalDateTime now = LocalDateTime.now();
        // Previous scan in San Francisco at (37.7749, -122.4194)
        ScanEvent prevScan = new ScanEvent("P000001", "DEV-001", now.minusMinutes(5), 37.7749, -122.4194, "ONLINE", "VALID", "IPHASH1");
        List<ScanEvent> history = List.of(prevScan);

        // New scan in London at (51.5074, -0.1278) just 5 minutes later (~8600 km distance)
        ScanEvent newScan = new ScanEvent("P000001", "DEV-002", now, 51.5074, -0.1278, "ONLINE", "VALID", "IPHASH2");

        RiskAssessmentService.RiskAssessmentResult result = riskAssessmentService.assess(product, newScan, history);

        assertEquals("CRITICAL", result.getRiskLevel());
        assertEquals("CLONE_DETECTED", result.getStatus());
        assertTrue(result.isCloneWarning());
        assertTrue(result.getRiskReason().contains("Impossible travel velocity"));
    }

    @Test
    @DisplayName("Multiple distinct devices exceeding threshold should trigger HIGH / CLONE_DETECTED")
    void testMultiDeviceCloneAnomaly() {
        Product product = new Product();
        product.setProductId("P000001");

        LocalDateTime now = LocalDateTime.now();
        List<ScanEvent> history = List.of(
                new ScanEvent("P000001", "DEV-001", now.minusHours(2), 37.77, -122.41, "ONLINE", "VALID", "IP1"),
                new ScanEvent("P000001", "DEV-002", now.minusHours(1), 37.78, -122.42, "ONLINE", "VALID", "IP2")
        );

        // 3rd unique device scanning same single-item QR
        ScanEvent newScan = new ScanEvent("P000001", "DEV-003", now, 37.79, -122.43, "ONLINE", "VALID", "IP3");

        RiskAssessmentService.RiskAssessmentResult result = riskAssessmentService.assess(product, newScan, history);

        assertEquals("HIGH", result.getRiskLevel());
        assertEquals("CLONE_DETECTED", result.getStatus());
        assertTrue(result.isCloneWarning());
    }
}

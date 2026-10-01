package com.authentiq.service;

import com.authentiq.dto.ScanEventDto;
import com.authentiq.dto.ScanSubmissionRequest;
import com.authentiq.dto.ScanSubmissionResponse;
import com.authentiq.entity.Product;
import com.authentiq.entity.ScanEvent;
import com.authentiq.entity.ScanSummary;
import com.authentiq.exception.ResourceNotFoundException;
import com.authentiq.repository.ProductRepository;
import com.authentiq.repository.ScanEventRepository;
import com.authentiq.repository.ScanSummaryRepository;
import com.authentiq.util.HashUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ScanService {

    private final ScanEventRepository scanEventRepository;
    private final ScanSummaryRepository scanSummaryRepository;
    private final ProductRepository productRepository;
    private final RiskAssessmentService riskAssessmentService;

    public ScanService(ScanEventRepository scanEventRepository,
                       ScanSummaryRepository scanSummaryRepository,
                       ProductRepository productRepository,
                       RiskAssessmentService riskAssessmentService) {
        this.scanEventRepository = scanEventRepository;
        this.scanSummaryRepository = scanSummaryRepository;
        this.productRepository = productRepository;
        this.riskAssessmentService = riskAssessmentService;
    }

    @Transactional
    public ScanSubmissionResponse recordScan(ScanSubmissionRequest request, String ipAddress) {
        Product product = productRepository.findByProductId(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + request.getProductId()));

        String deviceHash = request.getDeviceIdentifierHash() != null && !request.getDeviceIdentifierHash().isEmpty()
                ? request.getDeviceIdentifierHash()
                : HashUtil.sha256Hex("ANONYMOUS_DEVICE_" + ipAddress);

        String ipHash = HashUtil.sha256Hex(ipAddress);
        LocalDateTime eventTimestamp = request.getTimestamp() != null ? request.getTimestamp() : LocalDateTime.now();

        // 1. Fetch previous scan history for risk assessment
        List<ScanEvent> history = scanEventRepository.findByProductIdOrderByTimestampDesc(request.getProductId());

        // 2. Build new scan event
        ScanEvent scanEvent = new ScanEvent(
                request.getProductId(),
                deviceHash,
                eventTimestamp,
                request.getLatitude(),
                request.getLongitude(),
                request.getNetworkStatus() != null ? request.getNetworkStatus() : "ONLINE",
                request.getVerificationResult() != null ? request.getVerificationResult() : "VALID",
                ipHash
        );
        scanEventRepository.save(scanEvent);

        // 3. Evaluate risk using multi-factor Risk Engine
        RiskAssessmentService.RiskAssessmentResult riskResult = riskAssessmentService.assess(product, scanEvent, history);

        // 4. Update or create scan summary
        ScanSummary summary = scanSummaryRepository.findByProductId(request.getProductId())
                .orElseGet(() -> new ScanSummary(request.getProductId()));

        summary.setTotalScans(history.size() + 1);
        long uniqueDevices = scanEventRepository.countDistinctDevicesByProductId(request.getProductId());
        summary.setUniqueDevices((int) uniqueDevices);
        summary.setLastScannedAt(eventTimestamp);
        summary.setRiskLevel(riskResult.getRiskLevel());
        summary.setStatus(riskResult.getStatus());
        summary.setRiskReason(riskResult.getRiskReason());

        scanSummaryRepository.save(summary);

        return new ScanSubmissionResponse(
                product.getProductId(),
                summary.getRiskLevel(),
                summary.getStatus(),
                summary.getRiskReason(),
                summary.getTotalScans(),
                summary.getUniqueDevices(),
                summary.getLastScannedAt(),
                riskResult.isCloneWarning()
        );
    }

    public Page<ScanEventDto> getScansForProduct(String productId, Pageable pageable) {
        return scanEventRepository.findByProductIdOrderByTimestampDesc(productId, pageable)
                .map(s -> new ScanEventDto(
                        s.getId(),
                        s.getProductId(),
                        s.getDeviceIdentifierHash(),
                        s.getTimestamp(),
                        s.getLatitude(),
                        s.getLongitude(),
                        s.getNetworkStatus(),
                        s.getVerificationResult(),
                        s.getCreatedAt()
                ));
    }
}

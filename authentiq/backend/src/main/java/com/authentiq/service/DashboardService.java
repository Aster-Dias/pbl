package com.authentiq.service;

import com.authentiq.dto.DashboardStatsResponse;
import com.authentiq.dto.ProductResponse;
import com.authentiq.dto.ScanEventDto;
import com.authentiq.entity.Manufacturer;
import com.authentiq.entity.Product;
import com.authentiq.entity.ScanEvent;
import com.authentiq.entity.ScanSummary;
import com.authentiq.exception.ResourceNotFoundException;
import com.authentiq.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final ProductRepository productRepository;
    private final ScanEventRepository scanEventRepository;
    private final ScanSummaryRepository scanSummaryRepository;
    private final ManufacturerRepository manufacturerRepository;

    public DashboardService(ProductRepository productRepository,
                            ScanEventRepository scanEventRepository,
                            ScanSummaryRepository scanSummaryRepository,
                            ManufacturerRepository manufacturerRepository) {
        this.productRepository = productRepository;
        this.scanEventRepository = scanEventRepository;
        this.scanSummaryRepository = scanSummaryRepository;
        this.manufacturerRepository = manufacturerRepository;
    }

    public DashboardStatsResponse getStatistics(String manufacturerEmail) {
        Manufacturer manufacturer = manufacturerRepository.findByEmail(manufacturerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Manufacturer not found"));

        long totalProducts = productRepository.countByManufacturerId(manufacturer.getId());
        long totalScans = scanEventRepository.count();
        long validScans = scanEventRepository.countValidScans();
        long invalidScans = scanEventRepository.countInvalidScans();
        long productsAtRisk = scanSummaryRepository.countProductsAtRisk();
        long suspiciousScans = scanSummaryRepository.countSuspiciousProducts();

        List<ProductResponse> recentProducts = productRepository
                .findByManufacturerId(manufacturer.getId(), PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent().stream()
                .map(this::mapToProductResponse)
                .collect(Collectors.toList());

        List<ScanEventDto> recentScans = scanEventRepository
                .findAll(PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "timestamp")))
                .getContent().stream()
                .map(this::mapToScanEventDto)
                .collect(Collectors.toList());

        DashboardStatsResponse res = new DashboardStatsResponse();
        res.setTotalProducts(totalProducts);
        res.setTotalScans(totalScans);
        res.setVerifiedScans(validScans);
        res.setInvalidScans(invalidScans);
        res.setSuspiciousScans(suspiciousScans);
        res.setProductsAtRisk(productsAtRisk);
        res.setRecentProducts(recentProducts);
        res.setRecentScans(recentScans);

        return res;
    }

    private ProductResponse mapToProductResponse(Product p) {
        ProductResponse res = new ProductResponse();
        res.setId(p.getId());
        res.setProductId(p.getProductId());
        res.setProductName(p.getProductName());
        res.setBrand(p.getBrand());
        res.setCategory(p.getCategory());
        res.setBatchNumber(p.getBatchNumber());
        res.setManufacturingDate(p.getManufacturingDate());
        res.setExpiryDate(p.getExpiryDate());
        res.setStatus(p.getStatus());
        res.setCreatedAt(p.getCreatedAt());

        Optional<ScanSummary> summary = scanSummaryRepository.findByProductId(p.getProductId());
        res.setScanCount(summary.map(ScanSummary::getTotalScans).orElse(0));
        res.setRiskLevel(summary.map(ScanSummary::getRiskLevel).orElse("LOW"));

        return res;
    }

    private ScanEventDto mapToScanEventDto(ScanEvent s) {
        return new ScanEventDto(
                s.getId(),
                s.getProductId(),
                s.getDeviceIdentifierHash(),
                s.getTimestamp(),
                s.getLatitude(),
                s.getLongitude(),
                s.getNetworkStatus(),
                s.getVerificationResult(),
                s.getCreatedAt()
        );
    }
}

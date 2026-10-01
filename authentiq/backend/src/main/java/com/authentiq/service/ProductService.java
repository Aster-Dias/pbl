package com.authentiq.service;

import com.authentiq.crypto.CanonicalPayloadService;
import com.authentiq.crypto.KeyManager;
import com.authentiq.dto.*;
import com.authentiq.entity.*;
import com.authentiq.exception.AuthentiQException;
import com.authentiq.exception.ResourceNotFoundException;
import com.authentiq.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductSignatureRepository signatureRepository;
    private final PublicKeyRepository publicKeyRepository;
    private final ScanSummaryRepository scanSummaryRepository;
    private final ScanEventRepository scanEventRepository;
    private final ManufacturerRepository manufacturerRepository;
    private final CanonicalPayloadService canonicalPayloadService;
    private final KeyManager keyManager;
    private final QrCodeService qrCodeService;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private final SecureRandom secureRandom = new SecureRandom();

    public ProductService(ProductRepository productRepository,
                          ProductSignatureRepository signatureRepository,
                          PublicKeyRepository publicKeyRepository,
                          ScanSummaryRepository scanSummaryRepository,
                          ScanEventRepository scanEventRepository,
                          ManufacturerRepository manufacturerRepository,
                          CanonicalPayloadService canonicalPayloadService,
                          KeyManager keyManager,
                          QrCodeService qrCodeService) {
        this.productRepository = productRepository;
        this.signatureRepository = signatureRepository;
        this.publicKeyRepository = publicKeyRepository;
        this.scanSummaryRepository = scanSummaryRepository;
        this.scanEventRepository = scanEventRepository;
        this.manufacturerRepository = manufacturerRepository;
        this.canonicalPayloadService = canonicalPayloadService;
        this.keyManager = keyManager;
        this.qrCodeService = qrCodeService;
    }

    @Transactional
    public ProductDetailResponse createProduct(CreateProductRequest request, String manufacturerEmail) {
        Manufacturer manufacturer = manufacturerRepository.findByEmail(manufacturerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Manufacturer not found for: " + manufacturerEmail));

        // 1. Generate unique Product ID
        String productId = generateUniqueProductId(manufacturer.getOrganizationCode());

        // 2. Fetch or generate active public key for manufacturer
        PublicKeyRecord activeKey = keyManager.getOrCreateActivePublicKey(manufacturer.getId(), manufacturer.getOrganizationCode());

        // 3. Create Product entity
        Product product = new Product();
        product.setProductId(productId);
        product.setProductName(request.getProductName().trim());
        product.setBrand(request.getBrand().trim());
        product.setCategory(request.getCategory() != null ? request.getCategory().trim() : "General");
        product.setBatchNumber(request.getBatchNumber().trim());
        product.setManufacturingDate(request.getManufacturingDate());
        product.setExpiryDate(request.getExpiryDate());
        product.setManufacturerId(manufacturer.getId());
        product.setStatus("ACTIVE");
        Product savedProduct = productRepository.save(product);

        // 4. Build canonical payload
        String canonicalPayload = canonicalPayloadService.buildCanonicalPayload(
                savedProduct,
                manufacturer.getOrganizationCode(),
                activeKey.getKeyVersion()
        );

        // 5. Sign canonical payload using ECDSA P-256 private key
        String signature = keyManager.signWithKeyId(activeKey.getKeyId(), canonicalPayload);

        // 6. Store signature
        ProductSignature productSignature = new ProductSignature(
                productId,
                "ES256",
                activeKey.getKeyVersion(),
                canonicalPayload,
                signature
        );
        signatureRepository.save(productSignature);

        // 7. Initialize Scan Summary
        ScanSummary summary = new ScanSummary(productId);
        scanSummaryRepository.save(summary);

        // 8. Build QR payload
        QrPayloadDto qrPayload = new QrPayloadDto(
                activeKey.getKeyVersion(),
                "ES256",
                activeKey.getKeyId(),
                manufacturer.getOrganizationCode(),
                productId,
                savedProduct.getProductName(),
                savedProduct.getBrand(),
                savedProduct.getBatchNumber(),
                savedProduct.getManufacturingDate().format(DATE_FORMATTER),
                savedProduct.getExpiryDate().format(DATE_FORMATTER),
                signature
        );

        String qrJson = qrCodeService.toJsonString(qrPayload);
        String qrBase64 = qrCodeService.generateQrCodeBase64(qrJson, 400, 400);

        return mapToDetailResponse(savedProduct, productSignature, activeKey.getKeyId(), qrPayload, qrBase64, summary, List.of());
    }

    public Page<ProductResponse> getProductsForManufacturer(String manufacturerEmail, String query, Pageable pageable) {
        Manufacturer manufacturer = manufacturerRepository.findByEmail(manufacturerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Manufacturer not found"));

        Page<Product> productPage;
        if (query != null && !query.trim().isEmpty()) {
            productPage = productRepository.searchProducts(manufacturer.getId(), query.trim(), pageable);
        } else {
            productPage = productRepository.findByManufacturerId(manufacturer.getId(), pageable);
        }

        return productPage.map(this::mapToProductResponse);
    }

    public ProductDetailResponse getProductDetails(String productId) {
        Product product = productRepository.findByProductId(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        ProductSignature signature = signatureRepository.findByProductId(productId)
                .orElse(null);

        ScanSummary summary = scanSummaryRepository.findByProductId(productId)
                .orElse(new ScanSummary(productId));

        Manufacturer manufacturer = manufacturerRepository.findById(product.getManufacturerId())
                .orElse(null);

        String orgCode = manufacturer != null ? manufacturer.getOrganizationCode() : "AUTH";
        PublicKeyRecord activeKey = publicKeyRepository.findFirstByManufacturerIdAndActiveTrueOrderByKeyVersionDesc(product.getManufacturerId())
                .orElse(null);
        String keyId = activeKey != null ? activeKey.getKeyId() : "AUTHENTIQ-KEY-001";

        QrPayloadDto qrPayload = null;
        String qrBase64 = null;

        if (signature != null) {
            qrPayload = new QrPayloadDto(
                    signature.getKeyVersion(),
                    signature.getAlgorithm(),
                    keyId,
                    orgCode,
                    product.getProductId(),
                    product.getProductName(),
                    product.getBrand(),
                    product.getBatchNumber(),
                    product.getManufacturingDate().format(DATE_FORMATTER),
                    product.getExpiryDate().format(DATE_FORMATTER),
                    signature.getSignature()
            );
            String qrJson = qrCodeService.toJsonString(qrPayload);
            qrBase64 = qrCodeService.generateQrCodeBase64(qrJson, 400, 400);
        }

        List<ScanEventDto> recentScans = scanEventRepository.findByProductIdOrderByTimestampDesc(productId).stream()
                .limit(20)
                .map(this::mapToScanEventDto)
                .collect(Collectors.toList());

        return mapToDetailResponse(product, signature, keyId, qrPayload, qrBase64, summary, recentScans);
    }

    public ProductQrResponse getProductQr(String productId) {
        ProductDetailResponse details = getProductDetails(productId);
        if (details.getQrPayload() == null) {
            throw new AuthentiQException("QR signature not available for product " + productId, "QR_NOT_AVAILABLE");
        }
        String qrJson = qrCodeService.toJsonString(details.getQrPayload());
        String qrBase64 = qrCodeService.generateQrCodeBase64(qrJson, 400, 400);
        String dataUrl = "data:image/png;base64," + qrBase64;
        return new ProductQrResponse(productId, qrBase64, dataUrl, details.getQrPayload());
    }

    public byte[] getProductQrImageBytes(String productId, int width, int height) {
        ProductDetailResponse details = getProductDetails(productId);
        if (details.getQrPayload() == null) {
            throw new AuthentiQException("QR signature not available for product " + productId, "QR_NOT_AVAILABLE");
        }
        String qrJson = qrCodeService.toJsonString(details.getQrPayload());
        return qrCodeService.generateQrCodePng(qrJson, width > 0 ? width : 400, height > 0 ? height : 400);
    }

    private String generateUniqueProductId(String orgCode) {
        String prefix = (orgCode != null && !orgCode.isEmpty()) ? orgCode : "AUTH";
        for (int i = 0; i < 10; i++) {
            int randomNum = 100000 + secureRandom.nextInt(900000);
            String pid = prefix + "-P" + randomNum;
            if (!productRepository.existsByProductId(pid)) {
                return pid;
            }
        }
        return prefix + "-P" + System.currentTimeMillis();
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

    private ProductDetailResponse mapToDetailResponse(Product product, ProductSignature signature, String keyId,
                                                      QrPayloadDto qrPayload, String qrBase64,
                                                      ScanSummary summary, List<ScanEventDto> recentScans) {
        ProductDetailResponse res = new ProductDetailResponse();
        res.setId(product.getId());
        res.setProductId(product.getProductId());
        res.setProductName(product.getProductName());
        res.setBrand(product.getBrand());
        res.setCategory(product.getCategory());
        res.setBatchNumber(product.getBatchNumber());
        res.setManufacturingDate(product.getManufacturingDate());
        res.setExpiryDate(product.getExpiryDate());
        res.setStatus(product.getStatus());
        res.setCreatedAt(product.getCreatedAt());
        res.setUpdatedAt(product.getUpdatedAt());

        if (signature != null) {
            res.setAlgorithm(signature.getAlgorithm());
            res.setKeyVersion(signature.getKeyVersion());
            res.setKeyId(keyId);
            res.setSignature(signature.getSignature());
            res.setCanonicalPayload(signature.getCanonicalPayload());
        }

        res.setQrPayload(qrPayload);
        res.setQrCodeBase64(qrBase64);

        if (summary != null) {
            res.setTotalScans(summary.getTotalScans());
            res.setUniqueDevices(summary.getUniqueDevices());
            res.setLastScannedAt(summary.getLastScannedAt());
            res.setRiskLevel(summary.getRiskLevel());
            res.setRiskReason(summary.getRiskReason());
            res.setSummaryStatus(summary.getStatus());
        }

        res.setRecentScans(recentScans);
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

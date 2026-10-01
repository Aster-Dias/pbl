package com.authentiq.service;

import com.authentiq.crypto.CanonicalPayloadService;
import com.authentiq.crypto.KeyManager;
import com.authentiq.entity.Manufacturer;
import com.authentiq.entity.Product;
import com.authentiq.entity.ProductSignature;
import com.authentiq.entity.PublicKeyRecord;
import com.authentiq.entity.ScanSummary;
import com.authentiq.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    private final ManufacturerRepository manufacturerRepository;
    private final ProductRepository productRepository;
    private final ProductSignatureRepository signatureRepository;
    private final PublicKeyRepository publicKeyRepository;
    private final ScanSummaryRepository scanSummaryRepository;
    private final KeyManager keyManager;
    private final CanonicalPayloadService canonicalPayloadService;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(ManufacturerRepository manufacturerRepository,
                           ProductRepository productRepository,
                           ProductSignatureRepository signatureRepository,
                           PublicKeyRepository publicKeyRepository,
                           ScanSummaryRepository scanSummaryRepository,
                           KeyManager keyManager,
                           CanonicalPayloadService canonicalPayloadService,
                           PasswordEncoder passwordEncoder) {
        this.manufacturerRepository = manufacturerRepository;
        this.productRepository = productRepository;
        this.signatureRepository = signatureRepository;
        this.publicKeyRepository = publicKeyRepository;
        this.scanSummaryRepository = scanSummaryRepository;
        this.keyManager = keyManager;
        this.canonicalPayloadService = canonicalPayloadService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (manufacturerRepository.count() == 0) {
            logger.info("Initializing AuthentiQ Demo Seed Data...");

            // 1. Create Demo Manufacturer
            Manufacturer mfg = new Manufacturer(
                    "AuthentiQ Demo Manufacturer",
                    "admin@authentiq.demo",
                    passwordEncoder.encode("admin123"),
                    "AUTH"
            );
            Manufacturer savedMfg = manufacturerRepository.save(mfg);

            // 2. Generate Demo KeyPair
            PublicKeyRecord pubKey = keyManager.getOrCreateActivePublicKey(savedMfg.getId(), savedMfg.getOrganizationCode());
            logger.info("Generated Demo ECDSA Key: ID={}, Version={}", pubKey.getKeyId(), pubKey.getKeyVersion());

            // 3. Create Sample Products
            seedProduct(savedMfg, pubKey, "AUTH-P001", "Acme Paracetamol 500mg", "Acme Pharma", "Pharmaceuticals", "BATCH001", LocalDate.of(2026, 8, 1), LocalDate.of(2028, 8, 1));
            seedProduct(savedMfg, pubKey, "AUTH-P002", "Luxe Leather Handbag", "Aura Luxury", "Apparel & Accessories", "LHB-2026-X", LocalDate.of(2026, 5, 15), LocalDate.of(2031, 5, 15));
            seedProduct(savedMfg, pubKey, "AUTH-P003", "ProAudio Wireless Earbuds", "SonicWave", "Electronics", "SW-9092", LocalDate.of(2026, 7, 10), LocalDate.of(2029, 7, 10));

            logger.info("AuthentiQ Demo Seed Data Initialization Complete. 3 sample products signed.");
        }
    }

    private void seedProduct(Manufacturer mfg, PublicKeyRecord key, String pid, String name, String brand, String cat, String batch, LocalDate mfgDate, LocalDate expDate) {
        Product p = new Product();
        p.setProductId(pid);
        p.setProductName(name);
        p.setBrand(brand);
        p.setCategory(cat);
        p.setBatchNumber(batch);
        p.setManufacturingDate(mfgDate);
        p.setExpiryDate(expDate);
        p.setManufacturerId(mfg.getId());
        p.setStatus("ACTIVE");
        Product saved = productRepository.save(p);

        String canonical = canonicalPayloadService.buildCanonicalPayload(saved, mfg.getOrganizationCode(), key.getKeyVersion());
        String signature = keyManager.signWithKeyId(key.getKeyId(), canonical);

        ProductSignature sig = new ProductSignature(pid, "ES256", key.getKeyVersion(), canonical, signature);
        signatureRepository.save(sig);

        ScanSummary summary = new ScanSummary(pid);
        scanSummaryRepository.save(summary);
    }
}

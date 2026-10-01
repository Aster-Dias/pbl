package com.authentiq.crypto;

import com.authentiq.dto.QrPayloadDto;
import com.authentiq.entity.Product;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CanonicalPayloadServiceTest {

    private CanonicalPayloadService canonicalPayloadService;

    @BeforeEach
    void setUp() {
        canonicalPayloadService = new CanonicalPayloadService();
    }

    @Test
    @DisplayName("Product entity and QrPayloadDto should produce identical canonical strings")
    void testCanonicalStringConsistency() {
        Product product = new Product();
        product.setProductId("P000001");
        product.setProductName("Acme Paracetamol");
        product.setBrand("ACME");
        product.setBatchNumber("BATCH001");
        product.setManufacturingDate(LocalDate.of(2026, 8, 1));
        product.setExpiryDate(LocalDate.of(2028, 8, 1));
        product.setManufacturerId(100L);

        String fromProduct = canonicalPayloadService.buildCanonicalPayload(product, "AUTH001", 1);

        QrPayloadDto qr = new QrPayloadDto();
        qr.setV(1);
        qr.setMid("AUTH001");
        qr.setPid("P000001");
        qr.setName("Acme Paracetamol");
        qr.setBrand("ACME");
        qr.setBatch("BATCH001");
        qr.setMfg("2026-08-01");
        qr.setExp("2028-08-01");

        String fromQr = canonicalPayloadService.buildCanonicalPayload(qr);

        assertEquals("AUTHENTIQ|1|AUTH001|P000001|Acme Paracetamol|ACME|BATCH001|2026-08-01|2028-08-01", fromProduct);
        assertEquals(fromProduct, fromQr, "Canonical format from Product and QR DTO must be strictly identical");
    }
}

package com.authentiq.crypto;

import com.authentiq.dto.QrPayloadDto;
import com.authentiq.entity.Product;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
public class CanonicalPayloadService {

    public static final String PREFIX = "AUTHENTIQ";
    public static final String DELIMITER = "|";
    public static final int DEFAULT_VERSION = 1;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    /**
     * Builds deterministic canonical string from Product entity and manufacturer org code.
     * Format: AUTHENTIQ|version|manufacturerId|productId|productName|brand|batchNumber|mfgDate|expDate
     */
    public String buildCanonicalPayload(Product product, String manufacturerCode, int version) {
        String mfgDate = product.getManufacturingDate() != null ? product.getManufacturingDate().format(DATE_FORMATTER) : "";
        String expDate = product.getExpiryDate() != null ? product.getExpiryDate().format(DATE_FORMATTER) : "";

        return buildCanonicalString(
                version,
                manufacturerCode != null ? manufacturerCode : String.valueOf(product.getManufacturerId()),
                product.getProductId(),
                product.getProductName(),
                product.getBrand(),
                product.getBatchNumber(),
                mfgDate,
                expDate
        );
    }

    /**
     * Reconstructs canonical payload from a parsed QR payload DTO.
     */
    public String buildCanonicalPayload(QrPayloadDto qr) {
        int v = (qr.getV() != null) ? qr.getV() : DEFAULT_VERSION;
        return buildCanonicalString(
                v,
                qr.getMid(),
                qr.getPid(),
                qr.getName(),
                qr.getBrand(),
                qr.getBatch(),
                qr.getMfg(),
                qr.getExp()
        );
    }

    public String buildCanonicalString(int version, String mid, String pid, String name, String brand, String batch, String mfg, String exp) {
        return PREFIX + DELIMITER +
                version + DELIMITER +
                sanitize(mid) + DELIMITER +
                sanitize(pid) + DELIMITER +
                sanitize(name) + DELIMITER +
                sanitize(brand) + DELIMITER +
                sanitize(batch) + DELIMITER +
                sanitize(mfg) + DELIMITER +
                sanitize(exp);
    }

    private String sanitize(String value) {
        if (value == null) return "";
        return value.trim();
    }
}

package com.authentiq.service;

import com.authentiq.crypto.CanonicalPayloadService;
import com.authentiq.crypto.KeyManager;
import com.authentiq.dto.QrPayloadDto;
import com.authentiq.dto.ScanSubmissionRequest;
import com.authentiq.dto.ScanSubmissionResponse;
import com.authentiq.dto.VerifyOnlineRequest;
import com.authentiq.dto.VerifyOnlineResponse;
import com.authentiq.entity.Product;
import com.authentiq.entity.PublicKeyRecord;
import com.authentiq.exception.AuthentiQException;
import com.authentiq.repository.ProductRepository;
import com.authentiq.repository.PublicKeyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class VerifyService {

    private static final Logger logger = LoggerFactory.getLogger(VerifyService.class);

    private final CanonicalPayloadService canonicalPayloadService;
    private final KeyManager keyManager;
    private final PublicKeyRepository publicKeyRepository;
    private final ProductRepository productRepository;
    private final ScanService scanService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public VerifyService(CanonicalPayloadService canonicalPayloadService,
                         KeyManager keyManager,
                         PublicKeyRepository publicKeyRepository,
                         ProductRepository productRepository,
                         ScanService scanService) {
        this.canonicalPayloadService = canonicalPayloadService;
        this.keyManager = keyManager;
        this.publicKeyRepository = publicKeyRepository;
        this.productRepository = productRepository;
        this.scanService = scanService;
    }

    public VerifyOnlineResponse verifyOnline(VerifyOnlineRequest request, String ipAddress) {
        VerifyOnlineResponse response = new VerifyOnlineResponse();

        try {
            // 1. Parse QR JSON
            QrPayloadDto qrPayload = parseQrData(request.getQrData());
            response.setPayload(qrPayload);
            response.setKeyId(qrPayload.getKid());

            // 2. Check if Public Key exists
            Optional<PublicKeyRecord> keyRecordOpt = publicKeyRepository.findByKeyId(qrPayload.getKid());
            if (keyRecordOpt.isEmpty()) {
                response.setCryptographicallyValid(false);
                response.setVerificationStatus("UNKNOWN_KEY");
                response.setMessage("Signing public key " + qrPayload.getKid() + " is unknown to the network.");
                return response;
            }

            // 3. Reconstruct canonical payload
            String canonicalPayload = canonicalPayloadService.buildCanonicalPayload(qrPayload);
            response.setCanonicalPayload(canonicalPayload);

            // 4. Verify ECDSA signature
            boolean isValidSig = keyManager.verifyWithKeyId(qrPayload.getKid(), canonicalPayload, qrPayload.getSig());
            response.setCryptographicallyValid(isValidSig);

            if (!isValidSig) {
                response.setVerificationStatus("INVALID");
                response.setMessage("Cryptographic signature verification failed. The QR code is forged or tampered with.");
                // Record invalid scan attempt
                try {
                    scanService.recordScan(new ScanSubmissionRequest(
                            qrPayload.getPid(),
                            request.getDeviceIdentifierHash(),
                            request.getTimestamp(),
                            request.getLatitude(),
                            request.getLongitude(),
                            "ONLINE",
                            "INVALID"
                    ), ipAddress);
                } catch (Exception ignored) {}
                return response;
            }

            // 5. Signature is VALID - now analyze duplicate scan / clone risk
            Optional<Product> productOpt = productRepository.findByProductId(qrPayload.getPid());
            if (productOpt.isPresent()) {
                ScanSubmissionResponse scanResult = scanService.recordScan(new ScanSubmissionRequest(
                        qrPayload.getPid(),
                        request.getDeviceIdentifierHash(),
                        request.getTimestamp(),
                        request.getLatitude(),
                        request.getLongitude(),
                        "ONLINE",
                        "VALID"
                ), ipAddress);

                response.setRiskLevel(scanResult.getRiskLevel());
                response.setRiskReason(scanResult.getRiskReason());
                response.setTotalScans(scanResult.getTotalScans());
                response.setCloneWarning(scanResult.isCloneWarning());

                if (scanResult.isCloneWarning() || "CLONE_DETECTED".equals(scanResult.getStatus()) || "HIGH".equals(scanResult.getRiskLevel()) || "CRITICAL".equals(scanResult.getRiskLevel())) {
                    response.setVerificationStatus("SUSPICIOUS_CLONE");
                    response.setMessage("Cryptographically VALID, but suspicious duplicate scan activity detected (Possible QR Clone).");
                } else {
                    response.setVerificationStatus("GENUINE");
                    response.setMessage("Product verified genuine with valid ECDSA signature and normal scan history.");
                }
            } else {
                // Cryptographically valid signature from recognized key, but not in local DB (e.g. offline registered)
                response.setVerificationStatus("GENUINE");
                response.setRiskLevel("LOW");
                response.setMessage("Digital signature valid and verified.");
            }

        } catch (Exception e) {
            logger.error("Online verification error", e);
            response.setCryptographicallyValid(false);
            response.setVerificationStatus("INVALID");
            response.setMessage("Failed to verify QR data: " + e.getMessage());
        }

        return response;
    }

    private QrPayloadDto parseQrData(String qrData) {
        try {
            return objectMapper.readValue(qrData.trim(), QrPayloadDto.class);
        } catch (Exception e) {
            throw new AuthentiQException("Malformed QR JSON payload: " + e.getMessage(), "MALFORMED_QR");
        }
    }
}

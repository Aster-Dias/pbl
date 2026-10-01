package com.authentiq;

import com.authentiq.crypto.CanonicalPayloadService;
import com.authentiq.crypto.SignatureService;
import com.authentiq.dto.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProductLifecycleIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SignatureService signatureService;

    @Autowired
    private CanonicalPayloadService canonicalPayloadService;

    @Test
    @DisplayName("End-to-end: Register -> Login -> Create Product -> Verify Offline ECDSA -> Record Scans")
    void testCompleteProductLifecycle() throws Exception {
        // 1. Register Manufacturer
        RegisterRequest registerReq = new RegisterRequest("Test Pharma Corp", "test@pharma.com", "securePassword123", "TPC");
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isOk());

        // 2. Login to get JWT
        LoginRequest loginReq = new LoginRequest("test@pharma.com", "securePassword123");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andReturn();

        ApiResponse<AuthResponse> authResponse = objectMapper.readValue(
                loginResult.getResponse().getContentAsString(),
                objectMapper.getTypeFactory().constructParametricType(ApiResponse.class, AuthResponse.class)
        );
        String jwtToken = authResponse.getData().getToken();
        assertNotNull(jwtToken);

        // 3. Create Product
        CreateProductRequest createReq = new CreateProductRequest(
                "Amoxicillin 250mg", "PharmaCare", "Antibiotics", "BATCH-AMX-99",
                LocalDate.of(2026, 9, 1), LocalDate.of(2029, 9, 1)
        );

        MvcResult createResult = mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isOk())
                .andReturn();

        ApiResponse<ProductDetailResponse> productResponse = objectMapper.readValue(
                createResult.getResponse().getContentAsString(),
                objectMapper.getTypeFactory().constructParametricType(ApiResponse.class, ProductDetailResponse.class)
        );

        ProductDetailResponse productDetail = productResponse.getData();
        assertNotNull(productDetail.getProductId());
        assertNotNull(productDetail.getSignature());
        assertNotNull(productDetail.getQrCodeBase64());
        assertNotNull(productDetail.getQrPayload());

        // 4. Fetch Public Keys (simulate mobile app downloading keys for offline use)
        MvcResult keysResult = mockMvc.perform(get("/api/keys"))
                .andExpect(status().isOk())
                .andReturn();

        ApiResponse<PublicKeyDto[]> keysResponse = objectMapper.readValue(
                keysResult.getResponse().getContentAsString(),
                objectMapper.getTypeFactory().constructParametricType(ApiResponse.class, PublicKeyDto[].class)
        );

        PublicKeyDto activeKey = null;
        for (PublicKeyDto k : keysResponse.getData()) {
            if (k.getKeyId().equals(productDetail.getKeyId())) {
                activeKey = k;
                break;
            }
        }
        assertNotNull(activeKey, "Active public key matching product's keyId must exist");

        // 5. Test Offline Verification logic (reconstructing canonical payload and verifying ECDSA with public key)
        String reconstructedCanonical = canonicalPayloadService.buildCanonicalPayload(productDetail.getQrPayload());
        boolean isOfflineVerified = signatureService.verify(
                reconstructedCanonical,
                productDetail.getQrPayload().getSig(),
                activeKey.getPublicKey()
        );
        assertTrue(isOfflineVerified, "Offline cryptographic verification MUST succeed without backend calls");

        // 6. Test Tamper resistance: Modify product name in payload
        QrPayloadDto tampered = productDetail.getQrPayload();
        tampered.setName("Counterfeit Fake Amoxicillin");
        String tamperedCanonical = canonicalPayloadService.buildCanonicalPayload(tampered);
        boolean isTamperVerified = signatureService.verify(
                tamperedCanonical,
                tampered.getSig(),
                activeKey.getPublicKey()
        );
        assertFalse(isTamperVerified, "Tampered payload MUST fail offline ECDSA verification");

        // 7. Submit Scan event to backend
        ScanSubmissionRequest scanReq = new ScanSubmissionRequest(
                productDetail.getProductId(), "DEV-PHONE-XYZ", null, 40.7128, -74.0060, "ONLINE", "VALID"
        );
        MvcResult scanResult = mockMvc.perform(post("/api/scans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(scanReq)))
                .andExpect(status().isOk())
                .andReturn();

        ApiResponse<ScanSubmissionResponse> scanResponse = objectMapper.readValue(
                scanResult.getResponse().getContentAsString(),
                objectMapper.getTypeFactory().constructParametricType(ApiResponse.class, ScanSubmissionResponse.class)
        );
        assertEquals("LOW", scanResponse.getData().getRiskLevel());
        assertEquals(1, scanResponse.getData().getTotalScans());
    }
}

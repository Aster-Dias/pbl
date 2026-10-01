package com.authentiq.controller;

import com.authentiq.dto.ApiResponse;
import com.authentiq.dto.ScanEventDto;
import com.authentiq.dto.ScanSubmissionRequest;
import com.authentiq.dto.ScanSubmissionResponse;
import com.authentiq.service.ScanService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/scans")
public class ScanController {

    private final ScanService scanService;

    public ScanController(ScanService scanService) {
        this.scanService = scanService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ScanSubmissionResponse>> submitScan(
            @Valid @RequestBody ScanSubmissionRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        ScanSubmissionResponse response = scanService.recordScan(request, clientIp);
        return ResponseEntity.ok(ApiResponse.ok("Scan event recorded and evaluated", response));
    }

    @GetMapping("/products/{productId}")
    public ResponseEntity<ApiResponse<Page<ScanEventDto>>> getProductScans(
            @PathVariable String productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<ScanEventDto> scans = scanService.getScansForProduct(productId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(scans));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isEmpty()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

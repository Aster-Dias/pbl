package com.authentiq.controller;

import com.authentiq.dto.ApiResponse;
import com.authentiq.dto.VerifyOnlineRequest;
import com.authentiq.dto.VerifyOnlineResponse;
import com.authentiq.service.VerifyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/verify")
public class VerifyController {

    private final VerifyService verifyService;

    public VerifyController(VerifyService verifyService) {
        this.verifyService = verifyService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<VerifyOnlineResponse>> verifyOnline(
            @Valid @RequestBody VerifyOnlineRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        VerifyOnlineResponse response = verifyService.verifyOnline(request, clientIp);
        return ResponseEntity.ok(ApiResponse.ok(response.getMessage(), response));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isEmpty()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

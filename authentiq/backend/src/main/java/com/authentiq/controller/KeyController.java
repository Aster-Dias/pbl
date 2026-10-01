package com.authentiq.controller;

import com.authentiq.dto.ApiResponse;
import com.authentiq.dto.PublicKeyDto;
import com.authentiq.service.KeyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/keys")
public class KeyController {

    private final KeyService keyService;

    public KeyController(KeyService keyService) {
        this.keyService = keyService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PublicKeyDto>>> getAllActiveKeys() {
        List<PublicKeyDto> keys = keyService.getAllActivePublicKeys();
        return ResponseEntity.ok(ApiResponse.ok("Active public keys retrieved for offline caching", keys));
    }

    @GetMapping("/{keyId}")
    public ResponseEntity<ApiResponse<PublicKeyDto>> getKeyById(@PathVariable String keyId) {
        PublicKeyDto key = keyService.getPublicKeyById(keyId);
        return ResponseEntity.ok(ApiResponse.ok(key));
    }
}

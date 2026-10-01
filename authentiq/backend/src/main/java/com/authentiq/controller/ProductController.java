package com.authentiq.controller;

import com.authentiq.dto.ApiResponse;
import com.authentiq.dto.CreateProductRequest;
import com.authentiq.dto.ProductDetailResponse;
import com.authentiq.dto.ProductQrResponse;
import com.authentiq.dto.ProductResponse;
import com.authentiq.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductDetailResponse>> createProduct(
            @Valid @RequestBody CreateProductRequest request,
            Authentication authentication) {
        String email = authentication.getName();
        ProductDetailResponse response = productService.createProduct(request, email);
        return ResponseEntity.ok(ApiResponse.ok("Product created and cryptographically signed", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ProductResponse>>> getProducts(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            Authentication authentication) {
        String email = authentication.getName();
        Sort.Direction sortDirection = "asc".equalsIgnoreCase(direction) ? Sort.Direction.ASC : Sort.Direction.DESC;
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));
        Page<ProductResponse> products = productService.getProductsForManufacturer(email, query, pageRequest);
        return ResponseEntity.ok(ApiResponse.ok(products));
    }

    @GetMapping("/{productId}")
    public ResponseEntity<ApiResponse<ProductDetailResponse>> getProductDetails(@PathVariable String productId) {
        ProductDetailResponse details = productService.getProductDetails(productId);
        return ResponseEntity.ok(ApiResponse.ok(details));
    }

    @GetMapping("/{productId}/qr")
    public ResponseEntity<ApiResponse<ProductQrResponse>> getProductQr(@PathVariable String productId) {
        ProductQrResponse qr = productService.getProductQr(productId);
        return ResponseEntity.ok(ApiResponse.ok(qr));
    }

    @GetMapping("/{productId}/qr/image")
    public ResponseEntity<byte[]> getProductQrImage(
            @PathVariable String productId,
            @RequestParam(defaultValue = "400") int width,
            @RequestParam(defaultValue = "400") int height) {
        byte[] imageBytes = productService.getProductQrImageBytes(productId, width, height);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + productId + "-qr.png\"")
                .contentType(MediaType.IMAGE_PNG)
                .body(imageBytes);
    }
}

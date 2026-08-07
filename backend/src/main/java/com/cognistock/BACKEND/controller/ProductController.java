package com.cognistock.backend.controller;

import com.cognistock.backend.common.ApiConstants;
import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.dto.request.ProductRequest;
import com.cognistock.backend.dto.response.ProductResponse;
import com.cognistock.backend.entity.AuditLog;
import com.cognistock.backend.service.AuditLogService;
import com.cognistock.backend.service.ProductService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getAll() {
        return ResponseEntity.ok(
            ApiResponse.success(productService.getAllProducts(), ApiConstants.FETCHED));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<ProductResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(
            ApiResponse.success(productService.getById(id), ApiConstants.FETCHED));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<ProductResponse>> create(
            @Valid @RequestBody ProductRequest request,
            HttpServletRequest httpRequest) {

        ProductResponse response = productService.create(request);
        auditLogService.log("CREATE", "Product", response.getId().toString(),
            "Created product: " + response.getName(),
            AuditLog.AuditStatus.SUCCESS, httpRequest);

        return ResponseEntity.status(HttpStatus.CREATED).body(
            ApiResponse.success(response, ApiConstants.CREATED));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<ProductResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request,
            HttpServletRequest httpRequest) {

        ProductResponse response = productService.update(id, request);
        auditLogService.log("UPDATE", "Product", id.toString(),
            "Updated product: " + response.getName(),
            AuditLog.AuditStatus.SUCCESS, httpRequest);

        return ResponseEntity.ok(
            ApiResponse.success(response, ApiConstants.UPDATED));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        auditLogService.log("DELETE", "Product", id.toString(),
            "Deleted product id: " + id,
            AuditLog.AuditStatus.SUCCESS, httpRequest);
        productService.delete(id);

        return ResponseEntity.ok(
            ApiResponse.success(null, ApiConstants.DELETED));
    }
}
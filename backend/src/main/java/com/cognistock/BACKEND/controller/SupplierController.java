package com.cognistock.backend.controller;

import com.cognistock.backend.common.ApiConstants;
import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.dto.request.SupplierRequest;
import com.cognistock.backend.dto.response.SupplierResponse;
import com.cognistock.backend.entity.AuditLog;
import com.cognistock.backend.service.AuditLogService;
import com.cognistock.backend.service.SupplierService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;
    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<SupplierResponse>>> getAll() {
        return ResponseEntity.ok(
            ApiResponse.success(supplierService.getAllSuppliers(), ApiConstants.FETCHED));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<SupplierResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(
            ApiResponse.success(supplierService.getById(id), ApiConstants.FETCHED));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<SupplierResponse>> create(
            @Valid @RequestBody SupplierRequest request,
            HttpServletRequest httpRequest) {

        SupplierResponse response = supplierService.create(request);
        auditLogService.log("CREATE", "Supplier", response.getId().toString(),
            "Created supplier: " + response.getName(),
            AuditLog.AuditStatus.SUCCESS, httpRequest);

        return ResponseEntity.status(HttpStatus.CREATED).body(
            ApiResponse.success(response, ApiConstants.CREATED));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<SupplierResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody SupplierRequest request,
            HttpServletRequest httpRequest) {

        SupplierResponse response = supplierService.update(id, request);
        auditLogService.log("UPDATE", "Supplier", id.toString(),
            "Updated supplier: " + response.getName(),
            AuditLog.AuditStatus.SUCCESS, httpRequest);

        return ResponseEntity.ok(
            ApiResponse.success(response, ApiConstants.UPDATED));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        auditLogService.log("DELETE", "Supplier", id.toString(),
            "Deleted supplier id: " + id,
            AuditLog.AuditStatus.SUCCESS, httpRequest);
        supplierService.delete(id);

        return ResponseEntity.ok(
            ApiResponse.success(null, ApiConstants.DELETED));
    }
}
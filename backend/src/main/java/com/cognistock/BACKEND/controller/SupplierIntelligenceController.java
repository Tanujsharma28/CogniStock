package com.cognistock.backend.controller;

import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.dto.response.SupplierIntelligenceDTO;
import com.cognistock.backend.service.SupplierIntelligenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierIntelligenceController {

    private final SupplierIntelligenceService supplierIntelligenceService;

    @GetMapping("/intelligence")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<SupplierIntelligenceDTO>>> getIntelligence() {
        return ResponseEntity.ok(
            ApiResponse.success(
                supplierIntelligenceService.analyze(),
                "Supplier intelligence generated"));
    }
}
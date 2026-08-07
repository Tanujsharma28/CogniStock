package com.cognistock.backend.controller;

import com.cognistock.backend.common.ApiConstants;
import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.dto.request.SalesRecordRequest;
import com.cognistock.backend.entity.AuditLog;
import com.cognistock.backend.entity.SalesRecord;
import com.cognistock.backend.service.AuditLogService;
import com.cognistock.backend.service.SalesRecordService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SalesRecordController {

    private final SalesRecordService salesRecordService;
    private final AuditLogService auditLogService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<SalesRecord>> create(
            @Valid @RequestBody SalesRecordRequest request,
            HttpServletRequest httpRequest) {

        SalesRecord saved = salesRecordService.create(request);
        auditLogService.log("CREATE", "SalesRecord",
            saved.getId().toString(),
            "Sale recorded: " + saved.getQuantitySold() +
            " units, revenue: ₹" + saved.getTotalRevenue(),
            AuditLog.AuditStatus.SUCCESS, httpRequest);

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(saved, ApiConstants.CREATED));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<SalesRecord>>> getAll() {
        return ResponseEntity.ok(
            ApiResponse.success(salesRecordService.getAll(), ApiConstants.FETCHED));
    }

    @GetMapping("/range")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<SalesRecord>>> getByRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(
            ApiResponse.success(salesRecordService.getByDateRange(start, end),
                ApiConstants.FETCHED));
    }

    @GetMapping("/product/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<SalesRecord>>> getByProduct(
            @PathVariable Long productId) {
        return ResponseEntity.ok(
            ApiResponse.success(salesRecordService.getByProduct(productId),
                ApiConstants.FETCHED));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSummary(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {

        if (start == null) start = LocalDate.now().minusDays(30);
        if (end == null) end = LocalDate.now();

        return ResponseEntity.ok(
            ApiResponse.success(salesRecordService.getSummary(start, end),
                ApiConstants.FETCHED));
    }
}
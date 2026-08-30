package com.cognistock.backend.controller;

import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    // Main summary — ek call mein sab
    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF', 'VIEWER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSummary() {
        return ResponseEntity.ok(
            ApiResponse.success(dashboardService.getSummary(), "Dashboard summary fetched"));
    }

    // Revenue trends
    @GetMapping("/revenue")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF', 'VIEWER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRevenue() {
        return ResponseEntity.ok(
            ApiResponse.success(dashboardService.getRevenueSummary(), "Revenue data fetched"));
    }

    // Business health score
    @GetMapping("/health")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF', 'VIEWER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHealth() {
        return ResponseEntity.ok(
            ApiResponse.success(dashboardService.getBusinessHealth(), "Health score fetched"));
    }

    // Active alerts
    @GetMapping("/alerts")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF', 'VIEWER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAlerts() {
        return ResponseEntity.ok(
            ApiResponse.success(dashboardService.getAlerts(), "Alerts fetched"));
    }

    // Top products
    @GetMapping("/top-products")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF', 'VIEWER')")
    public ResponseEntity<ApiResponse<Object>> getTopProducts() {
        return ResponseEntity.ok(
            ApiResponse.success(dashboardService.getTopProducts(), "Top products fetched"));
    }
}
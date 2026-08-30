package com.cognistock.backend.controller;

import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.service.ForecastAccuracyService;
import com.cognistock.backend.service.ForecastService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/forecast")
@RequiredArgsConstructor
public class ForecastController {

    private final ForecastService         forecastService;
    private final ForecastAccuracyService accuracyService;  // NEW

    // ── Existing endpoint — unchanged ─────────────────────────────────────────

    @GetMapping("/product/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<Object> getForecastForProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(forecastService.getForecast(productId));
    }

    // ── New endpoint — forecast accuracy ─────────────────────────────────────

    @GetMapping("/accuracy")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAccuracy() {
        Map<String, Object> report = accuracyService.getAccuracyReport();
        return ResponseEntity.ok(ApiResponse.success(report, "Forecast accuracy report"));
    }
}
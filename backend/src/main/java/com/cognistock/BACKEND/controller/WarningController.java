package com.cognistock.backend.controller;

import com.cognistock.backend.common.ApiConstants;
import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.service.WarningService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/warnings")
@RequiredArgsConstructor
public class WarningController {

    private final WarningService warningService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getWarnings() {
        return ResponseEntity.ok(
            ApiResponse.success(warningService.getWarnings(), ApiConstants.FETCHED));
    }
}
package com.cognistock.backend.controller;

import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.entity.AuditLog;
import com.cognistock.backend.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getRecent() {
        return ResponseEntity.ok(
            ApiResponse.success(auditLogService.getRecentLogs(), "Fetched successfully"));
    }

    @GetMapping("/user/{email}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getByUser(@PathVariable String email) {
        return ResponseEntity.ok(
            ApiResponse.success(auditLogService.getLogsByUser(email), "Fetched successfully"));
    }

    @GetMapping("/resource/{type}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getByResource(@PathVariable String type) {
        return ResponseEntity.ok(
            ApiResponse.success(auditLogService.getLogsByResource(type), "Fetched successfully"));
    }
}
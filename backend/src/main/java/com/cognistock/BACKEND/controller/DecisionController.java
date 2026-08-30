package com.cognistock.backend.controller;

import com.cognistock.backend.ai.DecisionRequest;
import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.entity.Decision;
import com.cognistock.backend.service.DecisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/decisions")
@RequiredArgsConstructor
public class DecisionController {

    private final DecisionService decisionService;

    // Create decision from AI recommendation
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Decision>> create(
            @RequestBody DecisionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
            decisionService.createDecision(request), "Decision created"));
    }

    // Get all decisions
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<Decision>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(
            decisionService.getAllDecisions(), "Decisions retrieved"));
    }

    // Get pending
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<Decision>>> getPending() {
        return ResponseEntity.ok(ApiResponse.success(
            decisionService.getPendingDecisions(), "Pending decisions retrieved"));
    }

    // Stats
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(
            decisionService.getStats(), "Decision stats retrieved"));
    }

    // Approve
    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Decision>> approve(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(
            decisionService.approve(id, body.get("approvedBy")), "Decision approved"));
    }

    // Reject
    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Decision>> reject(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(
            decisionService.reject(id, body.get("rejectedBy"),
                body.get("reason")), "Decision rejected"));
    }

    // Modify
    @PatchMapping("/{id}/modify")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<Decision>> modify(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.success(
            decisionService.modify(id, body.get("modifiedBy"),
                body.get("newAction")), "Decision modified"));
    }

    // Auto Execute
    @PatchMapping("/{id}/auto-execute")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<ApiResponse<Decision>> autoExecute(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
            decisionService.autoExecute(id), "Decision auto-executed"));
    }

    // Record outcome
@PatchMapping("/{id}/outcome")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public ResponseEntity<ApiResponse<Decision>> recordOutcome(
        @PathVariable Long id,
        @RequestBody Map<String, String> body) {
    return ResponseEntity.ok(ApiResponse.success(
        decisionService.recordOutcome(id, body.get("outcome"), body.get("notes")),
        "Outcome recorded"));
}
}
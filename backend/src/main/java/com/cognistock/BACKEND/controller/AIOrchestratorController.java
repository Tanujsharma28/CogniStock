package com.cognistock.backend.controller;

import com.cognistock.backend.ai.orchestrator.*;
import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.entity.BusinessMemory;
import com.cognistock.backend.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orchestrator")
@RequiredArgsConstructor
public class AIOrchestratorController {

    private final AIOrchestratorService orchestratorService;
    private final BusinessMemoryService memoryService;

    // Manual trigger — full AI pipeline
   @PostMapping("/trigger")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public ResponseEntity<ApiResponse<OrchestrationResult>> trigger(
        @RequestBody Map<String, String> body) {

        BusinessEvent event = BusinessEvent.builder()
            .type(BusinessEvent.EventType.MANUAL_TRIGGER)
            .triggeredBy(body.getOrDefault("triggeredBy", "ADMIN"))
            .resourceId(body.getOrDefault("resourceId", "SYSTEM"))
            .resourceType("MANUAL")
            .payload(Map.of())
            .occurredAt(LocalDateTime.now())
            .build();

        OrchestrationResult result = orchestratorService.orchestrate(event);
        return ResponseEntity.ok(ApiResponse.success(result, "AI Orchestration complete"));
    }

    // Business Memory — recall all
    @GetMapping("/memory")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public ResponseEntity<ApiResponse<List<BusinessMemory>>> memory() {
        return ResponseEntity.ok(
            ApiResponse.success(memoryService.recallAll(), "Business memory retrieved"));
    }
}
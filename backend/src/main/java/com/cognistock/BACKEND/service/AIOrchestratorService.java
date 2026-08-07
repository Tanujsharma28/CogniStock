package com.cognistock.backend.service;

import com.cognistock.backend.ai.RootCauseResponse;
import com.cognistock.backend.ai.orchestrator.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIOrchestratorService {

    private final DashboardService dashboardService;         // BusinessHealthService → DashboardService
    private final RootCauseAnalysisService rootCauseAnalysisService;
    private final BusinessMemoryService businessMemoryService;

    public OrchestrationResult orchestrate(BusinessEvent event) {
        log.info("AI Orchestrator triggered — Event: {}, Resource: {}",
            event.getType(), event.getResourceId());

        List<String> decisions = new ArrayList<>();
        String status = "SUCCESS";

        // Step 1 — Health Score
        Map<String, Object> health = null;
        try {
            health = dashboardService.getBusinessHealth();
            log.info("Health Score: {}", health.get("score"));
        } catch (Exception e) {
            log.error("Health engine failed: {}", e.getMessage());
            status = "PARTIAL";
        }

        // Step 2 — Root Cause
        RootCauseResponse rootCause = null;
        try {
            rootCause = rootCauseAnalysisService.analyze();
            if (rootCause.getImmediateActions() != null) {
                decisions.addAll(rootCause.getImmediateActions());
            }
        } catch (Exception e) {
            log.error("Root cause failed: {}", e.getMessage());
            status = "PARTIAL";
        }

        // Step 3 — Business Memory
        try {
            businessMemoryService.remember(event, health, rootCause);
        } catch (Exception e) {
            log.error("Memory service failed: {}", e.getMessage());
        }

        // Step 4 — Confidence
        double confidence = rootCause != null
            ? rootCause.getOverallConfidence() : 0.0;

        return OrchestrationResult.builder()
            .triggerEvent(event)
            .healthScore(health)
            .rootCause(rootCause)
            .decisions(decisions)
            .immediateActions(decisions)
            .overallConfidence(confidence)
            .processedAt(LocalDateTime.now())
            .status(status)
            .build();
    }
}
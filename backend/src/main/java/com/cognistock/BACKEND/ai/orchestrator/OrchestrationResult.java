package com.cognistock.backend.ai.orchestrator;

import com.cognistock.backend.ai.RootCauseResponse;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class OrchestrationResult {
    private BusinessEvent triggerEvent;
    private Map<String, Object> healthScore;      // HealthScore → Map
    private RootCauseResponse rootCause;
    private List<String> decisions;
    private List<String> immediateActions;
    private String morningBriefSummary;
    private double overallConfidence;
    private LocalDateTime processedAt;
    private String status;
}
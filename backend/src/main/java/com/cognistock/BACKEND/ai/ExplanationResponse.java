package com.cognistock.backend.ai;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ExplanationResponse {
    private double overallScore;
    private HealthLevel label;
    private ConfidenceBreakdown confidence;
    private List<ReasoningResult> domains;
    private List<String> topActions;
    private List<String> evidenceSummary;
    private LocalDateTime generatedAt;
}
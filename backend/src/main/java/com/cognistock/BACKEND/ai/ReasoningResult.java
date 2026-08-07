package com.cognistock.backend.ai;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ReasoningResult {
    private DomainType domain;
    private double score;
    private HealthLevel label;
    private List<Reason> reasons;
    private List<Evidence> evidence;
    private List<String> recommendedActions;
    private double confidence;
    private List<String> dataGaps;
}
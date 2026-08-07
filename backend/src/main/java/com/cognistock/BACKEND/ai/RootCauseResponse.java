package com.cognistock.backend.ai;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class RootCauseResponse {
    private String problem;
    private String primaryCause;
    private List<String> contributingFactors;
    private List<CausalChain> causalChains;
    private List<Evidence> consolidatedEvidence;
    private String businessImpact;
    private double overallConfidence;
    private List<String> immediateActions;
    private List<String> preventiveActions;
    private LocalDateTime analyzedAt;
}
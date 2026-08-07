package com.cognistock.backend.ai;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class CausalChain {
    private DomainType domain;
    private String symptom;          // What we observe
    private List<WhyStep> whyChain;  // 5 Whys
    private String rootCause;        // Final answer
    private List<Evidence> evidence;
    private String businessImpact;
    private double confidence;
    private List<String> immediateActions;
    private List<String> preventiveActions;
}
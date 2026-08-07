package com.cognistock.backend.service;

import com.cognistock.backend.ai.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExplainableAIService {

    private final List<AIReasoning> reasoningEngines;

    public ExplanationResponse explain() {
        List<ReasoningResult> results = reasoningEngines.stream()
            .sorted(Comparator.comparingInt(AIReasoning::getOrder))
            .map(engine -> {
                try {
                    return engine.analyze();
                } catch (Exception e) {
                    log.error("Engine {} failed: {}", engine.getDomain(), e.getMessage());
                    return fallback(engine.getDomain());
                }
            })
            .collect(Collectors.toList());

        double overallScore = results.stream()
            .mapToDouble(ReasoningResult::getScore)
            .average().orElse(0.0);

        ConfidenceBreakdown confidence = buildConfidence(results);

        List<String> topActions = results.stream()
            .flatMap(r -> r.getRecommendedActions().stream())
            .distinct()
            .limit(5)
            .collect(Collectors.toList());

        List<String> evidenceSummary = results.stream()
            .flatMap(r -> r.getEvidence().stream())
            .map(Evidence::getDescription)
            .collect(Collectors.toList());

        return ExplanationResponse.builder()
            .overallScore(round(overallScore))
            .label(scoreToLevel(overallScore))
            .confidence(confidence)
            .domains(results)
            .topActions(topActions)
            .evidenceSummary(evidenceSummary)
            .generatedAt(LocalDateTime.now())
            .build();
    }

    private ConfidenceBreakdown buildConfidence(List<ReasoningResult> results) {
        Map<DomainType, Double> confMap = results.stream()
            .collect(Collectors.toMap(
                ReasoningResult::getDomain,
                ReasoningResult::getConfidence,
                (a, b) -> a
            ));

        double inv  = confMap.getOrDefault(DomainType.INVENTORY, 0.0);
        double sal  = confMap.getOrDefault(DomainType.SALES,     0.0);
        double sup  = confMap.getOrDefault(DomainType.SUPPLIER,  0.0);
        double fore = confMap.getOrDefault(DomainType.FORECAST,  0.0);
        double overall = (inv * 0.30) + (sal * 0.30) + (sup * 0.20) + (fore * 0.20);

        return ConfidenceBreakdown.builder()
            .inventory(round(inv))
            .sales(round(sal))
            .supplier(round(sup))
            .forecast(round(fore))
            .overall(round(overall))
            .build();
    }

    private ReasoningResult fallback(DomainType domain) {
        return ReasoningResult.builder()
            .domain(domain)
            .score(0)
            .label(HealthLevel.CRITICAL)
            .reasons(List.of(Reason.builder()
                .severity(Reason.Severity.HIGH)
                .message("Engine failed to analyze")
                .evidence("Internal error")
                .impact("Domain excluded from overall score")
                .build()))
            .evidence(List.of())
            .recommendedActions(List.of())
            .confidence(0)
            .dataGaps(List.of("Engine error — check logs"))
            .build();
    }

    public static HealthLevel scoreToLevel(double score) {
        if (score >= 80) return HealthLevel.EXCELLENT;
        if (score >= 65) return HealthLevel.GOOD;
        if (score >= 45) return HealthLevel.FAIR;
        if (score >= 30) return HealthLevel.WARNING;
        return HealthLevel.CRITICAL;
    }

    private double round(double val) {
        return Math.round(val * 100.0) / 100.0;
    }
}
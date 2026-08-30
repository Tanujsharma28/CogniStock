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
public class RootCauseAnalysisService {

    // Spring auto-injects ALL RootCauseAnalyzer implementations
    private final List<RootCauseAnalyzer> analyzers;

    public RootCauseResponse analyze() {
        // Run all analyzers sorted by priority
        List<CausalChain> chains = analyzers.stream()
            .sorted(Comparator.comparingInt(RootCauseAnalyzer::getOrder))
            .map(analyzer -> {
                try {
                    return analyzer.analyze();
                } catch (Exception e) {
                    log.error("Analyzer {} failed: {}", analyzer.getDomain(), e.getMessage());
                    return fallback(analyzer.getDomain());
                }
            })
            .collect(Collectors.toList());

        // Primary cause — from highest confidence chain
        CausalChain primaryChain = chains.stream()
            .max(Comparator.comparingDouble(CausalChain::getConfidence))
            .orElse(chains.get(0));

        // Contributing factors — root causes from all chains
        List<String> contributing = chains.stream()
            .map(CausalChain::getRootCause)
            .filter(Objects::nonNull)
            .distinct()
            .collect(Collectors.toList());

        // Consolidated evidence
        List<Evidence> allEvidence = chains.stream()
            .flatMap(c -> c.getEvidence().stream())
            .collect(Collectors.toList());

        // All immediate actions — deduplicated, limit 5
        List<String> immediate = chains.stream()
            .flatMap(c -> c.getImmediateActions().stream())
            .distinct()
            .limit(5)
            .collect(Collectors.toList());

        // All preventive actions — deduplicated, limit 5
        List<String> preventive = chains.stream()
            .flatMap(c -> c.getPreventiveActions().stream())
            .distinct()
            .limit(5)
            .collect(Collectors.toList());

        // Overall confidence — weighted average
        double overallConfidence = chains.stream()
            .mapToDouble(CausalChain::getConfidence)
            .average().orElse(0.0);

        // Business impact — combine all
        String businessImpact = chains.stream()
            .map(CausalChain::getBusinessImpact)
            .filter(Objects::nonNull)
            .collect(Collectors.joining(" | "));

        return RootCauseResponse.builder()
            .problem("Business Health Score critically low — multi-domain failure detected")
            .primaryCause(primaryChain.getRootCause())
            .contributingFactors(contributing)
            .causalChains(chains)
            .consolidatedEvidence(allEvidence)
            .businessImpact(businessImpact)
            .overallConfidence(Math.round(overallConfidence * 10.0) / 10.0)
            .immediateActions(immediate)
            .preventiveActions(preventive)
            .analyzedAt(LocalDateTime.now())
            .build();
    }

    private CausalChain fallback(DomainType domain) {
        return CausalChain.builder()
            .domain(domain)
            .symptom("Analysis failed")
            .whyChain(List.of(WhyStep.builder()
                .level(1)
                .question("Why did analysis fail?")
                .answer("Internal error in " + domain + " analyzer")
                .evidence("Check application logs")
                .isRootCause(true)
                .build()))
            .rootCause("Analyzer error — " + domain + " excluded")
            .evidence(List.of())
            .businessImpact("Unknown")
            .confidence(0.0)
            .immediateActions(List.of("Check logs for " + domain + " analyzer"))
            .preventiveActions(List.of())
            .build();
    }
}
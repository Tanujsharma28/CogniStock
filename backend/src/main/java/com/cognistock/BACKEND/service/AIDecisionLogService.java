package com.cognistock.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.cognistock.backend.entity.AIRecommendationLog;
import com.cognistock.backend.repository.AIRecommendationLogRepository;

@Service
public class AIDecisionLogService {

    @Autowired
    private AIRecommendationLogRepository logRepository;

    /**
     * Central logging point for every AI agent's recommendation.
     * Every agent (Pricing, Procurement, Inventory, Risk) calls this
     * so all decisions are stored in one explainable, auditable timeline.
     */
    public AIRecommendationLog log(
            String agentName,
            String recommendationType,
            String recommendation,
            String reason,
            double confidenceScore,
            Long productId,
            Long orderId,
            String businessImpact
    ) {
        AIRecommendationLog entry = new AIRecommendationLog();
        entry.setAgentName(agentName);
        entry.setRecommendationType(recommendationType);
        entry.setRecommendation(recommendation);
        entry.setReason(reason);
        entry.setConfidenceScore(confidenceScore);
        entry.setConfidenceLabel(labelFor(confidenceScore));
        entry.setRelatedProductId(productId);
        entry.setRelatedOrderId(orderId);
        entry.setBusinessImpact(businessImpact);
        entry.setDecisionStatus("PENDING");
        return logRepository.save(entry);
    }

    public AIRecommendationLog updateDecision(Long logId, String status) {
        AIRecommendationLog entry = logRepository.findById(logId).orElseThrow();
        entry.setDecisionStatus(status);
        entry.setDecidedAt(java.time.LocalDateTime.now());
        return logRepository.save(entry);
    }

    public static String labelFor(double score) {
        if (score >= 80) return "High";
        if (score >= 50) return "Medium";
        return "Low";
    }
}
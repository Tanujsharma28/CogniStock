package com.cognistock.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ai_recommendation_logs")
public class AIRecommendationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String agentName;        // e.g. "Pricing Agent", "Procurement Agent", "Inventory Agent"
    private String recommendationType; // e.g. "PRICE_CHANGE", "REORDER", "SUPPLIER_PICK", "STOCKOUT_WARNING"

    @Column(length = 2000)
    private String recommendation;   // human readable: "Increase price to ₹997.89"

    @Column(length = 2000)
    private String reason;

    private Double confidenceScore;  // 0-100
    private String confidenceLabel;  // "Low" / "Medium" / "High"

    private Long relatedProductId;
    private Long relatedOrderId;

    private String decisionStatus;   // "PENDING", "APPROVED", "REJECTED", "AUTO_APPLIED"
    private String businessImpact;   // e.g. "Estimated ₹4,200 margin gain"

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime decidedAt;

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAgentName() { return agentName; }
    public void setAgentName(String agentName) { this.agentName = agentName; }

    public String getRecommendationType() { return recommendationType; }
    public void setRecommendationType(String recommendationType) { this.recommendationType = recommendationType; }

    public String getRecommendation() { return recommendation; }
    public void setRecommendation(String recommendation) { this.recommendation = recommendation; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Double confidenceScore) { this.confidenceScore = confidenceScore; }

    public String getConfidenceLabel() { return confidenceLabel; }
    public void setConfidenceLabel(String confidenceLabel) { this.confidenceLabel = confidenceLabel; }

    public Long getRelatedProductId() { return relatedProductId; }
    public void setRelatedProductId(Long relatedProductId) { this.relatedProductId = relatedProductId; }

    public Long getRelatedOrderId() { return relatedOrderId; }
    public void setRelatedOrderId(Long relatedOrderId) { this.relatedOrderId = relatedOrderId; }

    public String getDecisionStatus() { return decisionStatus; }
    public void setDecisionStatus(String decisionStatus) { this.decisionStatus = decisionStatus; }

    public String getBusinessImpact() { return businessImpact; }
    public void setBusinessImpact(String businessImpact) { this.businessImpact = businessImpact; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getDecidedAt() { return decidedAt; }
    public void setDecidedAt(LocalDateTime decidedAt) { this.decidedAt = decidedAt; }
}
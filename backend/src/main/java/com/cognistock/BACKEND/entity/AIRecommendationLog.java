package com.cognistock.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.cognistock.backend.common.BaseEntity;
import lombok.EqualsAndHashCode;
@Entity
@Table(name = "ai_recommendation_logs")
@Data
@EqualsAndHashCode(callSuper = false)
public class AIRecommendationLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String agentName;
    private String recommendationType;

    @Column(length = 2000)
    private String recommendation;

    @Column(length = 2000)
    private String reason;

    private Double confidenceScore;
    private String confidenceLabel;

    private Long relatedProductId;
    private Long relatedOrderId;

    private String decisionStatus;
    private String businessImpact;

    private java.time.LocalDateTime decidedAt;
}
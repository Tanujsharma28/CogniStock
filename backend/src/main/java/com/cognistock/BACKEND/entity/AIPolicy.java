package com.cognistock.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_policy")
@Data
public class AIPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String executionMode;           // SUPERVISED | AUTONOMOUS

    @Column(nullable = false)
    private Double minConfidenceThreshold;  // 0.50 – 0.95

    @Column(nullable = false)
    private Boolean autoExecuteEnabled;     // true | false

    @Column(nullable = false)
    private Double maxOrderValueLimit;      // ₹ cap for auto-execution

    @Column(nullable = false)
    private String allowedActionTypes;      // comma-separated: "REORDER,PRICING"

    private LocalDateTime updatedAt;
    private String updatedBy;
}
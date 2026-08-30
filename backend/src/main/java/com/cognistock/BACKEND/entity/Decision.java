package com.cognistock.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "decisions")
@Data
public class Decision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String problemStatement;

    @Column(columnDefinition = "TEXT")
    private String rootCause;

    @Column(columnDefinition = "TEXT")
    private String recommendedAction;

    @Column(columnDefinition = "TEXT")
    private String modifiedAction;

    private String domain;
    private String priority;
    private String status;

    private String requestedBy;
    private String actionTakenBy;
    private String rejectionReason;

    private String outcome;

    @Column(columnDefinition = "TEXT")
    private String outcomeNotes;

    private Double confidence;    // ← NEW: AI confidence score (0.0 – 1.0)
    private Double orderValue;    // ← NEW: Estimated order value in ₹

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime decidedAt;
}
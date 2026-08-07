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
    private String modifiedAction;   // if MODIFIED

    private String domain;
    private String priority;
    private String status;           // PENDING, APPROVED, REJECTED, MODIFIED, AUTO_EXECUTED

    private String requestedBy;
    private String actionTakenBy;
    private String rejectionReason;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime decidedAt;
}
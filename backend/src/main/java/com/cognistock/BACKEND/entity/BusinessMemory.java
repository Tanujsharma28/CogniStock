package com.cognistock.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "business_memory")
@Data
public class BusinessMemory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String eventType;
    private String triggeredBy;
    private String resourceId;
    private String resourceType;

    private Double healthScore;
    private String healthGrade;

    @Column(columnDefinition = "TEXT")
    private String primaryCause;

    private Double confidence;

    @Column(columnDefinition = "TEXT")
    private String immediateActions;

    private LocalDateTime occurredAt;
    private LocalDateTime savedAt = LocalDateTime.now();
}
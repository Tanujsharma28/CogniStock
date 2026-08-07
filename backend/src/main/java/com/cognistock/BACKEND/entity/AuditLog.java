package com.cognistock.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userEmail;
    private String userRole;
    private String action;
    private String resourceType;
    private String resourceId;
    private String details;
    private String ipAddress;

    @Enumerated(EnumType.STRING)
    private AuditStatus status;

    private LocalDateTime timestamp;

    @PrePersist
    protected void setTimestamp() {
        this.timestamp = LocalDateTime.now();
    }

    public enum AuditStatus {
        SUCCESS, DENIED, FAILED
    }
}
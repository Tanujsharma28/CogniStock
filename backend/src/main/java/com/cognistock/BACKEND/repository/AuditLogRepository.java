package com.cognistock.backend.repository;

import com.cognistock.backend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop50ByOrderByTimestampDesc();
    List<AuditLog> findByUserEmailOrderByTimestampDesc(String email);
    List<AuditLog> findByResourceTypeOrderByTimestampDesc(String resourceType);
}
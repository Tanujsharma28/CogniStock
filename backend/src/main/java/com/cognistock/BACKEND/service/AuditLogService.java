package com.cognistock.backend.service;

import com.cognistock.backend.entity.AuditLog;
import com.cognistock.backend.entity.AuditLog.AuditStatus;
import com.cognistock.backend.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(String action, String resourceType, String resourceId,
                    String details, AuditStatus status, HttpServletRequest request) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            String email = (auth != null) ? auth.getName() : "anonymous";
            String role  = (auth != null && !auth.getAuthorities().isEmpty())
                ? auth.getAuthorities().iterator().next()
                      .getAuthority().replace("ROLE_", "")
                : "UNKNOWN";

            AuditLog auditLog = new AuditLog();
            auditLog.setUserEmail(email);
            auditLog.setUserRole(role);
            auditLog.setAction(action);
            auditLog.setResourceType(resourceType);
            auditLog.setResourceId(resourceId);
            auditLog.setDetails(details);
            auditLog.setIpAddress(request.getRemoteAddr());
            auditLog.setStatus(status);

            auditLogRepository.save(auditLog);

        } catch (Exception e) {
            log.error("Failed to save audit log: {}", e.getMessage());
        }
    }

    public List<AuditLog> getRecentLogs() {
        return auditLogRepository.findTop50ByOrderByTimestampDesc();
    }

    public List<AuditLog> getLogsByUser(String email) {
        return auditLogRepository.findByUserEmailOrderByTimestampDesc(email);
    }

    public List<AuditLog> getLogsByResource(String resourceType) {
        return auditLogRepository.findByResourceTypeOrderByTimestampDesc(resourceType);
    }
}
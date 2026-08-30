package com.cognistock.backend.service;

import com.cognistock.backend.ai.DecisionRequest;
import com.cognistock.backend.entity.AIPolicy;
import com.cognistock.backend.entity.Decision;
import com.cognistock.backend.repository.DecisionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DecisionService {

    private final DecisionRepository decisionRepository;
    private final AIPolicyService aipolicyService;  // ← NEW injection

    // Create decision from AI recommendation
    public Decision createDecision(DecisionRequest request) {
        Decision decision = new Decision();
        decision.setProblemStatement(request.getProblemStatement());
        decision.setRootCause(request.getRootCause());
        decision.setRecommendedAction(request.getRecommendedAction());
        decision.setDomain(request.getDomain());
        decision.setPriority(request.getPriority());
        decision.setStatus("PENDING");
        decision.setRequestedBy(request.getRequestedBy());
        decision.setConfidence(request.getConfidence());    // ← NEW
        decision.setOrderValue(request.getOrderValue());    // ← NEW
        decision.setCreatedAt(LocalDateTime.now());
        Decision saved = decisionRepository.save(decision);
        log.info("Decision created — ID: {}, Domain: {}, Confidence: {}, OrderValue: {}",
                saved.getId(), saved.getDomain(),
                saved.getConfidence(), saved.getOrderValue());
        return saved;
    }

    // Approve
    public Decision approve(Long id, String approvedBy) {
        Decision decision = decisionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Decision not found: " + id));
        decision.setStatus("APPROVED");
        decision.setActionTakenBy(approvedBy);
        decision.setDecidedAt(LocalDateTime.now());
        log.info("Decision APPROVED — ID: {}", id);
        return decisionRepository.save(decision);
    }

    // Reject
    public Decision reject(Long id, String rejectedBy, String reason) {
        Decision decision = decisionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Decision not found: " + id));
        decision.setStatus("REJECTED");
        decision.setActionTakenBy(rejectedBy);
        decision.setRejectionReason(reason);
        decision.setDecidedAt(LocalDateTime.now());
        log.info("Decision REJECTED — ID: {}", id);
        return decisionRepository.save(decision);
    }

    // Modify
    public Decision modify(Long id, String modifiedBy, String newAction) {
        Decision decision = decisionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Decision not found: " + id));
        decision.setStatus("MODIFIED");
        decision.setModifiedAction(newAction);
        decision.setActionTakenBy(modifiedBy);
        decision.setDecidedAt(LocalDateTime.now());
        log.info("Decision MODIFIED — ID: {}", id);
        return decisionRepository.save(decision);
    }

    // Auto Execute — policy-controlled
    public Decision autoExecute(Long id) {
        Decision decision = decisionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Decision not found: " + id));

        // ── POLICY CHECK ──────────────────────────────────────────────
        AIPolicy policy = aipolicyService.getPolicy();

        if (!"AUTONOMOUS".equals(policy.getExecutionMode())) {
            throw new IllegalStateException(
                "Auto-execution blocked: System is in SUPERVISED mode. " +
                "Switch to AUTONOMOUS in Settings to enable.");
        }

        if (!Boolean.TRUE.equals(policy.getAutoExecuteEnabled())) {
            throw new IllegalStateException(
                "Auto-execution blocked: Auto-execute is disabled in AI Policy settings.");
        }

        double confidence = decision.getConfidence() != null ? decision.getConfidence() : 0.0;
        if (confidence < policy.getMinConfidenceThreshold()) {
            throw new IllegalStateException(String.format(
                "Auto-execution blocked: Confidence %.1f%% is below minimum threshold %.1f%%.",
                confidence, policy.getMinConfidenceThreshold()));
        }

        double orderValue = decision.getOrderValue() != null ? decision.getOrderValue() : 0.0;
        if (orderValue > policy.getMaxOrderValueLimit()) {
            throw new IllegalStateException(String.format(
                "Auto-execution blocked: Order value ₹%.0f exceeds max limit ₹%.0f.",
                orderValue, policy.getMaxOrderValueLimit()));
        }

        String domain = decision.getDomain() != null ? decision.getDomain() : "";
        boolean actionAllowed = false;
        for (String allowed : policy.getAllowedActionTypes().split(",")) {
            if (domain.trim().equalsIgnoreCase(allowed.trim())) {
                actionAllowed = true;
                break;
            }
        }
        if (!actionAllowed) {
            throw new IllegalStateException(String.format(
                "Auto-execution blocked: Domain '%s' is not in allowed action types [%s].",
                domain, policy.getAllowedActionTypes()));
        }
        // ── END POLICY CHECK ──────────────────────────────────────────

        decision.setStatus("AUTO_EXECUTED");
        decision.setActionTakenBy("SYSTEM");
        decision.setDecidedAt(LocalDateTime.now());
        log.info("Decision AUTO_EXECUTED — ID: {}, Confidence: {}, OrderValue: {}",
                id, confidence, orderValue);
        return decisionRepository.save(decision);
    }

    // Get all
    public List<Decision> getAllDecisions() {
        return decisionRepository.findAllByOrderByCreatedAtDesc();
    }

    // Get pending only
    public List<Decision> getPendingDecisions() {
        return decisionRepository.findByStatusOrderByCreatedAtDesc("PENDING");
    }

    // Get by domain
    public List<Decision> getByDomain(String domain) {
        return decisionRepository.findByDomainOrderByCreatedAtDesc(domain);
    }

    // Stats — optimized: SQL-level GROUP BY instead of loading all rows
    public Map<String, Long> getStats() {
        List<Object[]> rows = decisionRepository.countByStatus();

        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("pending", 0L);
        counts.put("approved", 0L);
        counts.put("rejected", 0L);
        counts.put("modified", 0L);
        counts.put("autoExecuted", 0L);

        long total = 0L;
        for (Object[] row : rows) {
            String status = (String) row[0];
            Long count = (Long) row[1];

            String key = switch (status) {
                case "PENDING" -> "pending";
                case "APPROVED" -> "approved";
                case "REJECTED" -> "rejected";
                case "MODIFIED" -> "modified";
                case "AUTO_EXECUTED" -> "autoExecuted";
                default -> null; // unknown/future status → ignored, response shape unchanged
            };

            if (key != null) {
                counts.put(key, count);
                total += count;
            }
        }

        Map<String, Long> result = new LinkedHashMap<>();
        result.put("total", total);
        result.putAll(counts);
        return result;
    }

    // Record outcome
    public Decision recordOutcome(Long id, String outcome, String notes) {
        Decision decision = decisionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Decision not found: " + id));
        decision.setOutcome(outcome);
        decision.setOutcomeNotes(notes);
        log.info("Decision outcome recorded — ID: {}, Outcome: {}", id, outcome);
        return decisionRepository.save(decision);
    }
}
package com.cognistock.backend.service;

import com.cognistock.backend.ai.DecisionRequest;
import com.cognistock.backend.entity.Decision;
import com.cognistock.backend.repository.DecisionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DecisionService {

    private final DecisionRepository decisionRepository;

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
        decision.setCreatedAt(LocalDateTime.now());
        Decision saved = decisionRepository.save(decision);
        log.info("Decision created — ID: {}, Domain: {}", saved.getId(), saved.getDomain());
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

    // Auto Execute — system generated
    public Decision autoExecute(Long id) {
        Decision decision = decisionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Decision not found: " + id));
        decision.setStatus("AUTO_EXECUTED");
        decision.setActionTakenBy("SYSTEM");
        decision.setDecidedAt(LocalDateTime.now());
        log.info("Decision AUTO_EXECUTED — ID: {}", id);
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

    // Stats
    public Map<String, Long> getStats() {
        List<Decision> all = decisionRepository.findAll();
        return Map.of(
            "total", (long) all.size(),
            "pending", all.stream().filter(d -> "PENDING".equals(d.getStatus())).count(),
            "approved", all.stream().filter(d -> "APPROVED".equals(d.getStatus())).count(),
            "rejected", all.stream().filter(d -> "REJECTED".equals(d.getStatus())).count(),
            "modified", all.stream().filter(d -> "MODIFIED".equals(d.getStatus())).count(),
            "autoExecuted", all.stream().filter(d -> "AUTO_EXECUTED".equals(d.getStatus())).count()
        );
    }
}
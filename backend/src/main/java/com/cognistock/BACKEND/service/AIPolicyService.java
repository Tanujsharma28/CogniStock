package com.cognistock.backend.service;

import com.cognistock.backend.entity.AIPolicy;
import com.cognistock.backend.repository.AIPolicyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIPolicyService {

    private final AIPolicyRepository aipolicyRepository;

    // Get current policy — agar nahi hai toh default seed karo
    public AIPolicy getPolicy() {
        return aipolicyRepository.findTopByOrderByIdAsc()
                .orElseGet(this::createDefaultPolicy);
    }

    // Update policy
    public AIPolicy updatePolicy(AIPolicy request, String updatedBy) {
        AIPolicy policy = getPolicy();
        policy.setExecutionMode(request.getExecutionMode());
        policy.setMinConfidenceThreshold(request.getMinConfidenceThreshold());
        policy.setAutoExecuteEnabled(request.getAutoExecuteEnabled());
        policy.setMaxOrderValueLimit(request.getMaxOrderValueLimit());
        policy.setAllowedActionTypes(request.getAllowedActionTypes());
        policy.setUpdatedAt(LocalDateTime.now());
        policy.setUpdatedBy(updatedBy);
        AIPolicy saved = aipolicyRepository.save(policy);
        log.info("AI Policy updated by {} — mode: {}, threshold: {}, autoExecute: {}",
                updatedBy, saved.getExecutionMode(),
                saved.getMinConfidenceThreshold(),
                saved.getAutoExecuteEnabled());
        return saved;
    }

    // Default policy seed
    private AIPolicy createDefaultPolicy() {
        AIPolicy policy = new AIPolicy();
        policy.setExecutionMode("SUPERVISED");
        policy.setMinConfidenceThreshold(75.0);
        policy.setAutoExecuteEnabled(false);
        policy.setMaxOrderValueLimit(50000.0);
        policy.setAllowedActionTypes("REORDER");
        policy.setUpdatedAt(LocalDateTime.now());
        policy.setUpdatedBy("SYSTEM");
        AIPolicy saved = aipolicyRepository.save(policy);
        log.info("Default AI Policy created — SUPERVISED mode");
        return saved;
    }
}
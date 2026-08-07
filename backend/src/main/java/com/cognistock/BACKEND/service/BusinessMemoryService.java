package com.cognistock.backend.service;

import com.cognistock.backend.ai.RootCauseResponse;
import com.cognistock.backend.ai.orchestrator.BusinessEvent;
import com.cognistock.backend.entity.BusinessMemory;
import com.cognistock.backend.repository.BusinessMemoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BusinessMemoryService {

    private final BusinessMemoryRepository businessMemoryRepository;

    public void remember(BusinessEvent event,
                         Map<String, Object> health,    // HealthScore → Map
                         RootCauseResponse rootCause) {

        BusinessMemory memory = new BusinessMemory();
        memory.setEventType(event.getType().name());
        memory.setTriggeredBy(event.getTriggeredBy());
        memory.setResourceId(event.getResourceId());
        memory.setResourceType(event.getResourceType());

        if (health != null) {
            Object score = health.get("score");
            Object label = health.get("label");
            memory.setHealthScore(score != null
                ? ((Number) score).doubleValue() : null);
            memory.setHealthGrade(label != null ? label.toString() : null);
        }

        if (rootCause != null) {
            memory.setPrimaryCause(rootCause.getPrimaryCause());
            memory.setConfidence(rootCause.getOverallConfidence());
            memory.setImmediateActions(
                String.join(" | ", rootCause.getImmediateActions()));
        }

        memory.setOccurredAt(event.getOccurredAt() != null
            ? event.getOccurredAt() : LocalDateTime.now());

        businessMemoryRepository.save(memory);
        log.info("Business memory saved — Event: {}", event.getType());
    }

    public List<BusinessMemory> recallAll() {
        return businessMemoryRepository.findAllByOrderByOccurredAtDesc();
    }

    public List<BusinessMemory> recallByEventType(String eventType) {
        return businessMemoryRepository
            .findByEventTypeOrderByOccurredAtDesc(eventType);
    }
}
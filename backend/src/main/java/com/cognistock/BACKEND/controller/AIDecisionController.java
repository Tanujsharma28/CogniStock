package com.cognistock.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cognistock.backend.entity.AIRecommendationLog;
import com.cognistock.backend.repository.AIRecommendationLogRepository;
import com.cognistock.backend.service.AIDecisionLogService;

@RestController
@RequestMapping("/api/ai-decisions")
public class AIDecisionController {

    @Autowired
    private AIRecommendationLogRepository logRepository;

    @Autowired
    private AIDecisionLogService decisionLogService;

    @GetMapping
    public ResponseEntity<List<AIRecommendationLog>> getAllDecisions() {
        return ResponseEntity.ok(logRepository.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping("/{id}/decide")
    public ResponseEntity<Object> decide(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || (!status.equals("APPROVED") && !status.equals("REJECTED"))) {
            return ResponseEntity.badRequest().body("status must be APPROVED or REJECTED");
        }
        AIRecommendationLog updated = decisionLogService.updateDecision(id, status);
        return ResponseEntity.ok(updated);
    }
}
package com.cognistock.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cognistock.backend.entity.AIRecommendationLog;

public interface AIRecommendationLogRepository extends JpaRepository<AIRecommendationLog, Long> {
    List<AIRecommendationLog> findAllByOrderByCreatedAtDesc();
    List<AIRecommendationLog> findByAgentNameOrderByCreatedAtDesc(String agentName);
    List<AIRecommendationLog> findByDecisionStatusOrderByCreatedAtDesc(String decisionStatus);
}
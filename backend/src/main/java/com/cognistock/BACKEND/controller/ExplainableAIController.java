package com.cognistock.backend.controller;

import com.cognistock.backend.ai.ExplanationResponse;
import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.service.ExplainableAIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/explain")
@RequiredArgsConstructor
public class ExplainableAIController {

    private final ExplainableAIService explainableAIService;

    @GetMapping("/health")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<ExplanationResponse>> explainHealth() {
        return ResponseEntity.ok(
            ApiResponse.success(
                explainableAIService.explain(),
                "Explanation generated"));
    }
}
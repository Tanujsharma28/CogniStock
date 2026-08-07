package com.cognistock.backend.controller;

import com.cognistock.backend.ai.RootCauseResponse;
import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.service.RootCauseAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/root-cause")
@RequiredArgsConstructor
public class RootCauseController {

    private final RootCauseAnalysisService rootCauseAnalysisService;

   @GetMapping("/analyze")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public ResponseEntity<ApiResponse<RootCauseResponse>> analyze() {
    return ResponseEntity.ok(
        ApiResponse.success(
            rootCauseAnalysisService.analyze(),
            "Root cause analysis complete"));
}
}
package com.cognistock.backend.controller;

import com.cognistock.backend.entity.AIPolicy;
import com.cognistock.backend.service.AIPolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class AIPolicyController {

    private final AIPolicyService aipolicyService;

    // GET current policy
    @GetMapping("/ai-policy")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<AIPolicy> getPolicy() {
        return ResponseEntity.ok(aipolicyService.getPolicy());
    }

    // PUT update policy
    @PutMapping("/ai-policy")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<AIPolicy> updatePolicy(
            @RequestBody AIPolicy request,
            Authentication authentication) {
        String updatedBy = authentication.getName();
        return ResponseEntity.ok(aipolicyService.updatePolicy(request, updatedBy));
    }

    // GET account info — from JWT, no DB call
    @GetMapping("/account")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'VIEWER')")
    public ResponseEntity<Map<String, String>> getAccount(Authentication authentication) {
        String email = authentication.getName();
        String role = authentication.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .orElse("UNKNOWN");
        return ResponseEntity.ok(Map.of(
                "email", email,
                "role", role
        ));
    }
}
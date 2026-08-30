package com.cognistock.backend.controller;

import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.dto.request.SimulationRequestDTO;
import com.cognistock.backend.dto.response.SimulationResultDTO;
import com.cognistock.backend.service.BusinessSimulatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/simulate")
@RequiredArgsConstructor
public class BusinessSimulatorController {

    private final BusinessSimulatorService simulatorService;

    @PostMapping("/product/{productId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<SimulationResultDTO>> simulate(
            @PathVariable Long productId,
            @RequestBody SimulationRequestDTO request) {

        SimulationResultDTO result = simulatorService.simulate(productId, request);
        return ResponseEntity.ok(
            ApiResponse.success(result, "Simulation complete"));
    }
}
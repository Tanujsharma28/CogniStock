package com.cognistock.backend.service;

import com.cognistock.backend.dto.request.SimulationRequestDTO;
import com.cognistock.backend.dto.response.SimulationResultDTO;
import com.cognistock.backend.dto.response.SimulationResultDTO.DayProjection;
import com.cognistock.backend.dto.response.SimulationResultDTO.ScenarioResult;
import com.cognistock.backend.entity.Product;
import com.cognistock.backend.exception.ResourceNotFoundException;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.repository.SalesRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BusinessSimulatorService {

    private final ProductRepository productRepository;
    private final SalesRecordRepository salesRecordRepository;

    // Total products — health formula ke liye
    private static final int TOTAL_PRODUCTS = 10;

    public SimulationResultDTO simulate(Long productId, SimulationRequestDTO request) {

        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        // Daily demand — last 7 days moving average
        double dailyDemand = calculateDailyDemand(productId);

        // Trend
        String trend = detectTrend(productId);

        int horizonDays = request.getHorizonDays() > 0 ? request.getHorizonDays() : 7;
        int currentStock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        double price = product.getPrice() != null ? product.getPrice() : 0.0;

        // NO_ACTION scenario
        ScenarioResult noAction = runScenario(
            "NO_ACTION", currentStock, 0, horizonDays, dailyDemand, price,
            product.getReorderThreshold()
        );

        // REORDER scenario — only if reorderQty provided
        ScenarioResult reorder = null;
        if (request.getReorderQty() != null && request.getReorderQty() > 0) {
            reorder = runScenario(
                "REORDER", currentStock, request.getReorderQty(), horizonDays,
                dailyDemand, price, product.getReorderThreshold()
            );
        }

        return SimulationResultDTO.builder()
            .productId(productId)
            .productName(product.getName())
            .currentStock(currentStock)
            .dailyDemand(Math.round(dailyDemand * 100.0) / 100.0)
            .trend(trend)
            .horizonDays(horizonDays)
            .noAction(noAction)
            .reorder(reorder)
            .simulatedAt(java.time.LocalDateTime.now())
            .build();
    }

    // ─────────────────────────────────────────
    // Core simulation loop
    // ─────────────────────────────────────────
    private ScenarioResult runScenario(
        String scenarioName,
        int currentStock,
        int reorderQty,
        int horizonDays,
        double dailyDemand,
        double price,
        Integer reorderThreshold
    ) {
        int stock = currentStock + reorderQty;
        double totalRevenueAtRisk = 0.0;
        String stockoutDate = null;
        List<DayProjection> projections = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int day = 1; day <= horizonDays; day++) {
            LocalDate date = today.plusDays(day);

            // Demand slightly grows for GROWING trend
            double demand = dailyDemand;

            double revenueAtRisk = 0.0;
            boolean stockedOut = false;

            if (stock <= 0) {
                // Already stocked out
                revenueAtRisk = Math.round(demand * price * 100.0) / 100.0;
                totalRevenueAtRisk += revenueAtRisk;
                stockedOut = true;
                if (stockoutDate == null) stockoutDate = date.minusDays(1).toString();
            } else if (stock < demand) {
                // Partial stockout
                double unfulfilledDemand = demand - stock;
                revenueAtRisk = Math.round(unfulfilledDemand * price * 100.0) / 100.0;
                totalRevenueAtRisk += revenueAtRisk;
                if (unfulfilledDemand > 0 && stockoutDate == null) {
                    stockoutDate = date.toString();
                }
                stock = 0;
                stockedOut = true;
            } else {
                stock = (int) Math.max(0, stock - demand);
            }

            projections.add(DayProjection.builder()
                .day(day)
                .date(date.toString())
                .stock(stock)
                .revenueAtRisk(revenueAtRisk)
                .stockedOut(stockedOut)
                .build());
        }

        // Projected health score
        double healthScore = projectHealthScore(
            stock, reorderThreshold, totalRevenueAtRisk
        );
        double currentHealth = projectHealthScore(
            currentStock, reorderThreshold, 0
        );
        double healthDelta = Math.round((healthScore - currentHealth) * 100.0) / 100.0;

        // Recommendation
        String recommendation = buildRecommendation(
            scenarioName, stockoutDate, totalRevenueAtRisk, reorderQty
        );

        return ScenarioResult.builder()
            .scenario(scenarioName)
            .reorderQty(reorderQty > 0 ? reorderQty : null)
            .dailyProjection(projections)
            .stockoutDate(stockoutDate)
            .totalRevenueAtRisk(Math.round(totalRevenueAtRisk * 100.0) / 100.0)
            .projectedHealthScore(Math.round(healthScore * 100.0) / 100.0)
            .healthDelta(healthDelta)
            .recommendation(recommendation)
            .build();
    }

    // ─────────────────────────────────────────
    // Health score projection — reuse DashboardService formula
    // ─────────────────────────────────────────
    private double projectHealthScore(
        int projectedStock,
        Integer reorderThreshold,
        double revenueAtRisk
    ) {
        int threshold = reorderThreshold != null ? reorderThreshold : 0;
        boolean isBelowThreshold = projectedStock <= threshold;
        boolean isCritical = projectedStock == 0;

        // Simulate impact on overall business
        // Assume other 9 products unchanged — only this product changes
        int lowCount = isBelowThreshold ? 7 : 6;  // current baseline: 7 low
        int criticalCount = isCritical ? 1 : 0;
        int deadCount = 1;  // Wireless Earbuds always dead

        double stockScore = ((double)(TOTAL_PRODUCTS - lowCount) / TOTAL_PRODUCTS) * 40;
        double criticalPenalty = ((double) criticalCount / TOTAL_PRODUCTS) * 20;
        double deadPenalty = ((double) deadCount / TOTAL_PRODUCTS) * 10;
        double revenueScore = revenueAtRisk > 0 ? 20.0 : 30.0;

        return Math.max(0, Math.min(100,
            stockScore - criticalPenalty - deadPenalty + revenueScore));
    }

    // ─────────────────────────────────────────
    // Daily demand — last 30 days moving average
    // ─────────────────────────────────────────
    private double calculateDailyDemand(Long productId) {
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        var records = salesRecordRepository
            .findBySaleDateBetweenOrderBySaleDateDesc(thirtyDaysAgo, LocalDate.now())
            .stream()
            .filter(r -> r.getProduct() != null
                && r.getProduct().getId().equals(productId))
            .toList();

        if (records.isEmpty()) return 0.0;

        double totalQty = records.stream()
            .mapToInt(r -> r.getQuantitySold() != null ? r.getQuantitySold() : 0)
            .sum();

        // Active days mein divide karo
        long activeDays = records.stream()
            .map(r -> r.getSaleDate())
            .distinct()
            .count();

        return activeDays > 0 ? totalQty / activeDays : 0.0;
    }

    // ─────────────────────────────────────────
    // Trend detection — same as forecaster.py logic
    // ─────────────────────────────────────────
    private String detectTrend(Long productId) {
        LocalDate today = LocalDate.now();
        var recent = salesRecordRepository
            .findBySaleDateBetweenOrderBySaleDateDesc(today.minusDays(7), today)
            .stream()
            .filter(r -> r.getProduct() != null
                && r.getProduct().getId().equals(productId))
            .mapToInt(r -> r.getQuantitySold() != null ? r.getQuantitySold() : 0)
            .sum();

        var older = salesRecordRepository
            .findBySaleDateBetweenOrderBySaleDateDesc(today.minusDays(30), today.minusDays(8))
            .stream()
            .filter(r -> r.getProduct() != null
                && r.getProduct().getId().equals(productId))
            .mapToInt(r -> r.getQuantitySold() != null ? r.getQuantitySold() : 0)
            .sum();

        if (older == 0) return recent > 0 ? "RECOVERING" : "DEAD";

        double change = (double)(recent - older) / older;
        if (change > 0.20) return "GROWING";
        if (change < -0.20) return "DECLINING";
        return "STABLE";
    }

    // ─────────────────────────────────────────
    // Recommendation
    // ─────────────────────────────────────────
    private String buildRecommendation(
        String scenario, String stockoutDate,
        double revenueAtRisk, int reorderQty
    ) {
        if ("NO_ACTION".equals(scenario)) {
            if (stockoutDate != null) {
                return String.format(
                    "CRITICAL — Stockout on %s. ₹%.0f revenue at risk. Raise PO immediately.",
                    stockoutDate, revenueAtRisk);
            }
            return "SAFE — No stockout risk in simulation horizon.";
        } else {
            if (stockoutDate == null) {
                return String.format(
                    "SAFE — Reorder of %d units eliminates stockout risk.", reorderQty);
            }
            return String.format(
                "PARTIAL — Reorder of %d units delays stockout to %s. Consider larger order.",
                reorderQty, stockoutDate);
        }
    }
}
package com.cognistock.backend.service;

import com.cognistock.backend.ai.*;
import com.cognistock.backend.entity.Product;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.repository.SalesRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SalesReasoningService implements AIReasoning {

    private final SalesRecordRepository salesRecordRepository;
    private final ProductRepository productRepository;

    @Override
    public DomainType getDomain() { return DomainType.SALES; }

    @Override
    public int getOrder() { return 2; }

    @Override
    public ReasoningResult analyze() {
        LocalDate today = LocalDate.now();
        LocalDate thirty = today.minusDays(30);
        LocalDate seven = today.minusDays(7);

        long totalRecords = salesRecordRepository.count();
        Double revenue30 = salesRecordRepository.getTotalRevenueBetween(thirty, today);
        Double revenue7  = salesRecordRepository.getTotalRevenueBetween(seven, today);
        List<Object[]> topProducts = salesRecordRepository.getTopProductsBetween(thirty, today);
        List<Product> deadStock = salesRecordRepository.findDeadStockSince(thirty);
        int totalProducts = productRepository.findAll().size();

        if (revenue30 == null) revenue30 = 0.0;
        if (revenue7  == null) revenue7  = 0.0;

        int activeProducts = topProducts.size();
        int deadCount = deadStock.size();

        // Score: based on active product ratio + revenue presence
        double activeRatio = totalProducts > 0
            ? ((double) activeProducts / totalProducts) * 100 : 0;
        double score = Math.min(100, activeRatio);

        // Reasons
        List<Reason> reasons = new ArrayList<>();

        if (activeProducts == 0) {
            reasons.add(Reason.builder()
                .severity(Reason.Severity.HIGH)
                .message("No products sold in last 30 days")
                .evidence("Zero sales records found")
                .impact("Revenue generation has stopped")
                .build());
        } else {
            reasons.add(Reason.builder()
                .severity(Reason.Severity.INFO)
                .message(activeProducts + " products generating revenue")
                .evidence("Sales records found in last 30 days")
                .impact("Positive — but " + (totalProducts - activeProducts) + " products idle")
                .build());
        }

        if (deadCount > 0) {
            reasons.add(Reason.builder()
                .severity(Reason.Severity.HIGH)
                .message(deadCount + " products with zero sales in 30 days")
                .evidence("Dead stock detected — capital locked")
                .impact("Estimated capital blocked in dead stock")
                .build());
        }

        if (revenue7 < revenue30 / 4) {
            reasons.add(Reason.builder()
                .severity(Reason.Severity.HIGH)
                .message("Revenue declining — last 7 days significantly lower")
                .evidence(String.format("7-day: ₹%.2f vs 30-day avg: ₹%.2f/week",
                    revenue7, revenue30 / 4))
                .impact("Demand may be falling — investigate")
                .build());
        }

        // Evidence
        List<Evidence> evidence = new ArrayList<>();
        evidence.add(Evidence.builder()
            .source("SalesRecord")
            .metric("totalRecords")
            .value(String.valueOf(totalRecords))
            .description("Total sales records in system")
            .build());
        evidence.add(Evidence.builder()
            .source("SalesRecord")
            .metric("revenue30Days")
            .value(String.format("₹%.2f", revenue30))
            .description("Total revenue in last 30 days")
            .build());
        evidence.add(Evidence.builder()
            .source("SalesRecord")
            .metric("revenue7Days")
            .value(String.format("₹%.2f", revenue7))
            .description("Total revenue in last 7 days")
            .build());
        evidence.add(Evidence.builder()
            .source("Product")
            .metric("deadStockCount")
            .value(String.valueOf(deadCount))
            .description(deadCount + " products had zero sales in last 30 days")
            .build());

        topProducts.stream().limit(3).forEach(row ->
            evidence.add(Evidence.builder()
                .source("Product#" + row[0])
                .metric("revenue")
                .value(String.format("₹%.2f", row[3]))
                .description(row[1] + " — sold " + row[2] + " units, revenue ₹" + row[3])
                .build()));

        // Actions
        List<String> actions = new ArrayList<>();
        if (deadCount > 0) actions.add("Liquidate or discount " + deadCount + " dead stock products");
        if (activeProducts < totalProducts / 2)
            actions.add("Investigate why " + (totalProducts - activeProducts) + " products have no sales");
        if (revenue7 > 0) actions.add("Focus marketing on top-selling: "
            + (topProducts.isEmpty() ? "N/A" : topProducts.get(0)[1]));

        // Data gaps
        List<String> dataGaps = new ArrayList<>();
        if (totalRecords < 10)
            dataGaps.add("Insufficient sales history — confidence reduced. Record more sales.");
        if (totalRecords == 0)
            dataGaps.add("No sales records found — sales tracking not active");

        // Confidence based on data availability
        double confidence;
        if (totalRecords == 0) confidence = 10.0;
        else if (totalRecords < 10) confidence = 50.0;
        else if (totalRecords < 50) confidence = 75.0;
        else confidence = 90.0;

        return ReasoningResult.builder()
            .domain(DomainType.SALES)
            .score(Math.round(score * 100.0) / 100.0)
            .label(ExplainableAIService.scoreToLevel(score))
            .reasons(reasons)
            .evidence(evidence)
            .recommendedActions(actions)
            .confidence(confidence)
            .dataGaps(dataGaps)
            .build();
    }
}
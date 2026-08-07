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
public class SalesCauseAnalyzer implements RootCauseAnalyzer {

    private final SalesRecordRepository salesRecordRepository;
    private final ProductRepository productRepository;

    @Override
    public DomainType getDomain() { return DomainType.SALES; }

    @Override
    public int getOrder() { return 2; }

    @Override
    public CausalChain analyze() {
        LocalDate today = LocalDate.now();
        LocalDate thirty = today.minusDays(30);

        long totalRecords = salesRecordRepository.count();
        Double revenue30 = salesRecordRepository.getTotalRevenueBetween(thirty, today);
        List<Product> deadStock = salesRecordRepository.findDeadStockSince(thirty);
        List<Object[]> topProducts = salesRecordRepository.getTopProductsBetween(thirty, today);
        int totalProducts = productRepository.findAll().size();

        if (revenue30 == null) revenue30 = 0.0;
        int deadCount = deadStock.size();
        int activeCount = topProducts.size();

        // 5 Whys
        List<WhyStep> whyChain = new ArrayList<>();

        whyChain.add(WhyStep.builder()
            .level(1)
            .question("Why is sales performance critical?")
            .answer("Only " + activeCount + "/" + totalProducts
                + " products generated revenue in last 30 days")
            .evidence("SalesRecord: " + totalRecords
                + " records, but concentrated in " + activeCount + " products")
            .isRootCause(false)
            .build());

        whyChain.add(WhyStep.builder()
            .level(2)
            .question("Why are " + deadCount + " products not selling?")
            .answer("Products exist in inventory but have zero sales activity")
            .evidence("Dead stock: " + deadCount + " products with no sales in 30 days — "
                + "capital locked")
            .isRootCause(false)
            .build());

        whyChain.add(WhyStep.builder()
            .level(3)
            .question("Why is revenue concentrated in one product?")
            .answer("No pricing strategy, promotion, or demand analysis applied to other products")
            .evidence("Top product: "
                + (topProducts.isEmpty() ? "N/A" : topProducts.get(0)[1])
                + " — all others: ₹0 revenue")
            .isRootCause(false)
            .build());

        whyChain.add(WhyStep.builder()
            .level(4)
            .question("Why is there no demand strategy for dead stock?")
            .answer("No dynamic pricing engine or promotion trigger exists")
            .evidence("PricingService exists but not connected to dead stock detection")
            .isRootCause(false)
            .build());

        whyChain.add(WhyStep.builder()
            .level(5)
            .question("Why is pricing not responding to dead stock?")
            .answer("Dead stock detection and pricing engine are not integrated in workflow")
            .evidence(deadCount + " dead stock products identified — zero automated response triggered")
            .isRootCause(true)
            .build());

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
            .description("Revenue concentrated in " + activeCount + " products only")
            .build());
        evidence.add(Evidence.builder()
            .source("Product")
            .metric("deadStockCount")
            .value(String.valueOf(deadCount))
            .description(deadCount + " products with zero movement — capital locked")
            .build());

        deadStock.stream().limit(3).forEach(p ->
            evidence.add(Evidence.builder()
                .source("Product#" + p.getId())
                .metric("deadStock")
                .value("₹0 revenue")
                .description(p.getName() + " — stock: "
                    + p.getStockQuantity() + ", no sales in 30 days")
                .build()));

        String rootCause = deadCount > 5
            ? "Dead stock accumulation due to missing pricing-inventory integration — "
                + deadCount + " products stagnant"
            : "Revenue concentration risk — single product dependency";

        String impact = String.format(
            "%.0f%% of products generating zero revenue. "
            + "Capital locked in dead stock. Revenue at risk if top product demand drops.",
            (double) deadCount / totalProducts * 100);

        List<String> immediate = new ArrayList<>();
        immediate.add("Apply 15-20% discount on " + deadCount + " dead stock products immediately");
        immediate.add("Run promotion campaign on zero-revenue products");
        if (!topProducts.isEmpty())
            immediate.add("Ensure " + topProducts.get(0)[1] + " stays in stock — only revenue driver");

        List<String> preventive = new ArrayList<>();
        preventive.add("Connect dead stock detection to automatic pricing trigger");
        preventive.add("Set 30-day no-sale alert with auto-discount policy");
        preventive.add("Diversify revenue across minimum 5 products");

        double confidence = totalRecords > 50 ? 87.0
            : totalRecords > 10 ? 70.0 : 45.0;

        return CausalChain.builder()
            .domain(DomainType.SALES)
            .symptom(activeCount + "/" + totalProducts
                + " products selling — " + deadCount + " dead stock")
            .whyChain(whyChain)
            .rootCause(rootCause)
            .evidence(evidence)
            .businessImpact(impact)
            .confidence(confidence)
            .immediateActions(immediate)
            .preventiveActions(preventive)
            .build();
    }
}
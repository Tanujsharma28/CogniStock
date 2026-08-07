package com.cognistock.backend.service;

import com.cognistock.backend.ai.*;
import com.cognistock.backend.entity.Product;
import com.cognistock.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryReasoningService implements AIReasoning {

    private final ProductRepository productRepository;

    @Override
    public DomainType getDomain() { return DomainType.INVENTORY; }

    @Override
    public int getOrder() { return 1; }

    @Override
    public ReasoningResult analyze() {
        List<Product> all = productRepository.findAll();
        int total = all.size();
        long below = all.stream()
            .filter(p -> p.getStockQuantity() <= p.getReorderThreshold()).count();
        long critical = all.stream()
            .filter(p -> p.getStockQuantity() == 0).count();
        long healthy = total - below;
        double score = total > 0 ? ((double) healthy / total) * 100 : 100;

        List<Reason> reasons = new ArrayList<>();
        if (below > 0) {
            reasons.add(Reason.builder()
                .severity(Reason.Severity.HIGH)
                .message(below + "/" + total + " products below reorder threshold")
                .evidence(below + " products need immediate reorder")
                .impact("Stockout risk — potential revenue loss")
                .build());
        }
        if (critical > 0) {
            reasons.add(Reason.builder()
                .severity(Reason.Severity.HIGH)
                .message(critical + " products completely out of stock")
                .evidence("Stock quantity = 0")
                .impact("Active sales being lost right now")
                .build());
        }
        if (healthy > 0) {
            reasons.add(Reason.builder()
                .severity(Reason.Severity.INFO)
                .message(healthy + " products at healthy stock levels")
                .evidence("Stock > reorder threshold")
                .impact("Positive")
                .build());
        }

        List<Evidence> evidence = new ArrayList<>();
        evidence.add(Evidence.builder()
            .source("Product")
            .metric("totalProducts")
            .value(String.valueOf(total))
            .description("Total active products in inventory")
            .build());
        evidence.add(Evidence.builder()
            .source("Product")
            .metric("belowThreshold")
            .value(String.valueOf(below))
            .description(below + " products at or below reorder threshold")
            .build());
        evidence.add(Evidence.builder()
            .source("Product")
            .metric("outOfStock")
            .value(String.valueOf(critical))
            .description(critical + " products with zero stock")
            .build());

        all.stream()
            .filter(p -> p.getStockQuantity() <= p.getReorderThreshold())
            .limit(5)
            .forEach(p -> evidence.add(Evidence.builder()
                .source("Product#" + p.getId())
                .metric("stockQuantity")
                .value(String.valueOf(p.getStockQuantity()))
                .description(p.getName() + " — stock: " + p.getStockQuantity()
                    + ", threshold: " + p.getReorderThreshold())
                .build()));

        List<String> actions = new ArrayList<>();
        if (critical > 0) actions.add("URGENT: Restock " + critical + " out-of-stock products immediately");
        if (below > 0) actions.add("Raise Purchase Orders for " + below + " low-stock products");
        if (below == 0) actions.add("Inventory levels healthy — maintain current reorder schedule");

        List<String> dataGaps = new ArrayList<>();
        if (total == 0) dataGaps.add("No products found — populate inventory data");

        double confidence = total > 0 ? 95.0 : 10.0;

        return ReasoningResult.builder()
            .domain(DomainType.INVENTORY)
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
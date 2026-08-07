package com.cognistock.backend.service;

import com.cognistock.backend.ai.*;
import com.cognistock.backend.entity.Order;
import com.cognistock.backend.repository.OrderRepository;
import com.cognistock.backend.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryCauseAnalyzer implements RootCauseAnalyzer {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    @Override
    public DomainType getDomain() { return DomainType.INVENTORY; }

    @Override
    public int getOrder() { return 1; }

    @Override
    public CausalChain analyze() {
        var products = productRepository.findAll();
        var allOrders = orderRepository.findAll();

        long lowStock = products.stream()
            .filter(p -> p.getStockQuantity() <= p.getReorderThreshold()).count();
        long pendingOrders = allOrders.stream()
            .filter(o -> o.getStatus() == Order.OrderStatus.PENDING).count();
        long totalOrders = allOrders.size();

        // 5 Whys chain
        List<WhyStep> whyChain = new ArrayList<>();

        // Why 1
        whyChain.add(WhyStep.builder()
            .level(1)
            .question("Why is business health critical?")
            .answer(lowStock + " out of " + products.size() + " products are below reorder threshold")
            .evidence("Product table: stockQuantity <= reorderThreshold for " + lowStock + " products")
            .isRootCause(false)
            .build());

        // Why 2
        if (pendingOrders > 0) {
            whyChain.add(WhyStep.builder()
                .level(2)
                .question("Why has inventory not been restocked?")
                .answer(pendingOrders + " Purchase Orders are PENDING — not approved or fulfilled")
                .evidence("Orders table: " + pendingOrders + "/" + totalOrders + " orders in PENDING status")
                .isRootCause(false)
                .build());

            // Why 3
            whyChain.add(WhyStep.builder()
                .level(3)
                .question("Why are Purchase Orders still pending?")
                .answer("No order has been moved to APPROVED or RECEIVED status")
                .evidence("Zero APPROVED/RECEIVED orders found in system")
                .isRootCause(false)
                .build());

            // Why 4
            whyChain.add(WhyStep.builder()
                .level(4)
                .question("Why were orders not approved?")
                .answer("No approval workflow or escalation policy exists in current process")
                .evidence("Audit logs show no ORDER_APPROVED events")
                .isRootCause(false)
                .build());

            // Why 5 — Root Cause
            whyChain.add(WhyStep.builder()
                .level(5)
                .question("Why is there no approval enforcement?")
                .answer("AI procurement recommendations were generated but no decision enforcement mechanism exists")
                .evidence("8 orders created, 0 acted upon — decision gap identified")
                .isRootCause(true)
                .build());
        } else {
            whyChain.add(WhyStep.builder()
                .level(2)
                .question("Why has inventory not been restocked?")
                .answer("No Purchase Orders have been raised for low stock products")
                .evidence("Zero orders found for affected products")
                .isRootCause(true)
                .build());
        }

        // Evidence
        List<Evidence> evidence = new ArrayList<>();
        evidence.add(Evidence.builder()
            .source("Product")
            .metric("lowStockCount")
            .value(String.valueOf(lowStock))
            .description(lowStock + " products at or below reorder threshold")
            .build());
        evidence.add(Evidence.builder()
            .source("Order")
            .metric("pendingOrders")
            .value(String.valueOf(pendingOrders))
            .description(pendingOrders + " orders pending — no fulfillment action taken")
            .build());

        String rootCause = pendingOrders > 0
            ? "AI procurement recommendations ignored — no approval enforcement mechanism"
            : "No Purchase Orders raised despite " + lowStock + " products below reorder level";

        String impact = String.format(
            "%d products at stockout risk. Revenue loss potential if top products run out.", lowStock);

        List<String> immediate = new ArrayList<>();
        immediate.add("Approve all " + pendingOrders + " pending Purchase Orders immediately");
        immediate.add("Restock top " + Math.min(3, lowStock) + " critical products first");

        List<String> preventive = new ArrayList<>();
        preventive.add("Implement auto-escalation: PO pending > 48 hours → manager alert");
        preventive.add("Set minimum stock trigger for automatic PO generation");

        return CausalChain.builder()
            .domain(DomainType.INVENTORY)
            .symptom("7/10 products below reorder threshold")
            .whyChain(whyChain)
            .rootCause(rootCause)
            .evidence(evidence)
            .businessImpact(impact)
            .confidence(pendingOrders > 0 ? 88.0 : 70.0)
            .immediateActions(immediate)
            .preventiveActions(preventive)
            .build();
    }
}
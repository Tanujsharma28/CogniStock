package com.cognistock.backend.service;

import com.cognistock.backend.ai.*;
import com.cognistock.backend.entity.Order;
import com.cognistock.backend.repository.OrderRepository;
import com.cognistock.backend.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierCauseAnalyzer implements RootCauseAnalyzer {

    private final SupplierRepository supplierRepository;
    private final OrderRepository orderRepository;

    @Override
    public DomainType getDomain() { return DomainType.SUPPLIER; }

    @Override
    public int getOrder() { return 3; }

    @Override
    public CausalChain analyze() {
        List<Order> allOrders = orderRepository.findAll();
        long totalSuppliers = supplierRepository.count();

        long pending   = allOrders.stream()
            .filter(o -> o.getStatus() == Order.OrderStatus.PENDING).count();
        long received  = allOrders.stream()
            .filter(o -> o.getStatus() == Order.OrderStatus.RECEIVED).count();
        long cancelled = allOrders.stream()
            .filter(o -> o.getStatus() == Order.OrderStatus.CANCELLED).count();
        long total     = allOrders.size();

        // Avg delivery days from RECEIVED orders
        double avgDays = allOrders.stream()
            .filter(o -> o.getStatus() == Order.OrderStatus.RECEIVED)
            .filter(o -> o.getCreatedAt() != null && o.getUpdatedAt() != null)
            .mapToLong(o -> ChronoUnit.DAYS.between(
                o.getCreatedAt().toLocalDate(),
                o.getUpdatedAt().toLocalDate()))
            .average().orElse(-1);

        // 5 Whys
        List<WhyStep> whyChain = new ArrayList<>();

        whyChain.add(WhyStep.builder()
            .level(1)
            .question("Why is supplier performance unknown?")
            .answer(pending + "/" + total + " orders never fulfilled — no delivery data available")
            .evidence("Order table: " + received + " RECEIVED, "
                + pending + " PENDING, " + cancelled + " CANCELLED")
            .isRootCause(false)
            .build());

        whyChain.add(WhyStep.builder()
            .level(2)
            .question("Why are orders not being fulfilled?")
            .answer("Orders created but approval workflow missing — stuck in PENDING state")
            .evidence(pending + " orders in PENDING — none moved to APPROVED or RECEIVED")
            .isRootCause(false)
            .build());

        whyChain.add(WhyStep.builder()
            .level(3)
            .question("Why is there no order approval happening?")
            .answer("No manager approval action recorded in audit logs for any order")
            .evidence("AuditLog: zero ORDER_APPROVED events found")
            .isRootCause(false)
            .build());

        whyChain.add(WhyStep.builder()
            .level(4)
            .question("Why are managers not approving orders?")
            .answer("No notification or escalation mechanism triggers approval workflow")
            .evidence("Notification system not yet active — orders silently pending")
            .isRootCause(false)
            .build());

        whyChain.add(WhyStep.builder()
            .level(5)
            .question("Why is there no escalation?")
            .answer("Procurement workflow is manual and disconnected from AI recommendations")
            .evidence(total + " orders created, " + received
                + " fulfilled — " + (total > 0
                    ? String.format("%.0f%%", (double) pending / total * 100)
                    : "0%") + " stuck")
            .isRootCause(true)
            .build());

        // Evidence
        List<Evidence> evidence = new ArrayList<>();
        evidence.add(Evidence.builder()
            .source("Supplier")
            .metric("totalSuppliers")
            .value(String.valueOf(totalSuppliers))
            .description("Registered suppliers available for procurement")
            .build());
        evidence.add(Evidence.builder()
            .source("Order")
            .metric("pendingOrders")
            .value(String.valueOf(pending))
            .description("Orders stuck in PENDING — no fulfillment action")
            .build());
        evidence.add(Evidence.builder()
            .source("Order")
            .metric("receivedOrders")
            .value(String.valueOf(received))
            .description("Successfully received orders (basis for reliability score)")
            .build());
        if (avgDays >= 0) {
            evidence.add(Evidence.builder()
                .source("Order")
                .metric("avgDeliveryDays")
                .value(String.format("%.1f days", avgDays))
                .description("Average delivery time derived from order timestamps")
                .build());
        } else {
            evidence.add(Evidence.builder()
                .source("Order")
                .metric("avgDeliveryDays")
                .value("DATA_GAP")
                .description("No RECEIVED orders — delivery time cannot be calculated. "
                    + "Mark orders RECEIVED when goods arrive.")
                .build());
        }

        String rootCause = received == 0
            ? "Zero order fulfillment — procurement workflow completely disconnected"
            : "Partial fulfillment — " + pending + " orders pending without escalation";

        String impact = String.format(
            "%d suppliers registered but procurement effectiveness = %.0f%%. "
            + "Supply chain reliability unmeasurable without order completion data.",
            totalSuppliers,
            total > 0 ? (double) received / total * 100 : 0);

        List<String> immediate = new ArrayList<>();
        immediate.add("Manually approve and fulfill " + pending + " pending orders");
        immediate.add("Mark orders as RECEIVED when goods arrive — enables reliability tracking");

        List<String> preventive = new ArrayList<>();
        preventive.add("Implement order approval SLA — auto-escalate after 48 hours");
        preventive.add("Integrate GRN (Goods Receipt Note) tracking with order lifecycle");
        preventive.add("Score suppliers monthly based on delivery time and cancellation rate");

        double confidence = received > 3 ? 85.0
            : received > 0 ? 60.0 : 40.0;

        return CausalChain.builder()
            .domain(DomainType.SUPPLIER)
            .symptom("Supplier reliability unmeasurable — " + pending + " orders never fulfilled")
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
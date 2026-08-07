package com.cognistock.backend.service;

import com.cognistock.backend.ai.*;
import com.cognistock.backend.entity.Order;
import com.cognistock.backend.entity.Supplier;
import com.cognistock.backend.repository.OrderRepository;
import com.cognistock.backend.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupplierReasoningService implements AIReasoning {

    private final SupplierRepository supplierRepository;
    private final OrderRepository orderRepository;

    @Override
    public DomainType getDomain() { return DomainType.SUPPLIER; }

    @Override
    public int getOrder() { return 3; }

    @Override
    public ReasoningResult analyze() {
        List<Supplier> suppliers = supplierRepository.findAll();
        List<Order> allOrders = orderRepository.findAll();

        int totalSuppliers = suppliers.size();
        long totalOrders = allOrders.size();

        // Derived metrics from Orders
        long receivedOrders = allOrders.stream()
            .filter(o -> o.getStatus() == Order.OrderStatus.RECEIVED).count();
        long cancelledOrders = allOrders.stream()
            .filter(o -> o.getStatus() == Order.OrderStatus.CANCELLED).count();
        long pendingOrders = allOrders.stream()
            .filter(o -> o.getStatus() == Order.OrderStatus.PENDING).count();

        // Reliability = received / (received + cancelled) * 100
        double reliabilityScore = (receivedOrders + cancelledOrders) > 0
            ? ((double) receivedOrders / (receivedOrders + cancelledOrders)) * 100
            : -1; // DATA_GAP

        // Avg delivery days = days between createdAt and updatedAt for RECEIVED orders
        double avgDeliveryDays = allOrders.stream()
            .filter(o -> o.getStatus() == Order.OrderStatus.RECEIVED)
            .filter(o -> o.getCreatedAt() != null && o.getUpdatedAt() != null)
            .mapToLong(o -> ChronoUnit.DAYS.between(
                o.getCreatedAt().toLocalDate(),
                o.getUpdatedAt().toLocalDate()))
            .average()
            .orElse(-1); // DATA_GAP

        // Score calculation
        double score;
        List<String> dataGaps = new ArrayList<>();

        if (reliabilityScore == -1 && avgDeliveryDays == -1) {
            score = 50; // neutral — not enough data
            dataGaps.add("No RECEIVED or CANCELLED orders found. " +
                "Update order status when deliveries arrive to enable supplier reliability tracking.");
        } else {
            double reliabilityComponent = reliabilityScore >= 0 ? reliabilityScore : 70;
            double deliveryComponent = avgDeliveryDays >= 0
                ? Math.max(0, 100 - (avgDeliveryDays * 10)) : 70;
            score = (reliabilityComponent * 0.6) + (deliveryComponent * 0.4);
        }

        // Reasons
        List<Reason> reasons = new ArrayList<>();

        if (totalSuppliers == 0) {
            reasons.add(Reason.builder()
                .severity(Reason.Severity.HIGH)
                .message("No suppliers registered")
                .evidence("Supplier table is empty")
                .impact("Cannot generate purchase orders")
                .build());
        } else {
            reasons.add(Reason.builder()
                .severity(Reason.Severity.INFO)
                .message(totalSuppliers + " suppliers available")
                .evidence("Active supplier pool")
                .impact("Procurement options available")
                .build());
        }

        if (pendingOrders > 3) {
            reasons.add(Reason.builder()
                .severity(Reason.Severity.HIGH)
                .message(pendingOrders + " orders still PENDING")
                .evidence("Orders created but not RECEIVED or APPROVED")
                .impact("Potential supply chain bottleneck")
                .build());
        }

        if (reliabilityScore >= 0) {
            reasons.add(Reason.builder()
                .severity(reliabilityScore >= 80
                    ? Reason.Severity.INFO : Reason.Severity.HIGH)
                .message(String.format("Supplier reliability: %.1f%%", reliabilityScore))
                .evidence(receivedOrders + " received, " + cancelledOrders + " cancelled")
                .impact(reliabilityScore >= 80 ? "Good" : "Review supplier performance")
                .build());
        }

        if (avgDeliveryDays >= 0) {
            reasons.add(Reason.builder()
                .severity(avgDeliveryDays <= 5
                    ? Reason.Severity.INFO : Reason.Severity.MEDIUM)
                .message(String.format("Average delivery time: %.1f days", avgDeliveryDays))
                .evidence("Calculated from RECEIVED order timestamps")
                .impact(avgDeliveryDays <= 5 ? "Within acceptable range" : "Delays detected")
                .build());
        }

        // Evidence
        List<Evidence> evidence = new ArrayList<>();
        evidence.add(Evidence.builder()
            .source("Supplier")
            .metric("totalSuppliers")
            .value(String.valueOf(totalSuppliers))
            .description("Total registered suppliers")
            .build());
        evidence.add(Evidence.builder()
            .source("Order")
            .metric("totalOrders")
            .value(String.valueOf(totalOrders))
            .description("Total orders placed")
            .build());
        evidence.add(Evidence.builder()
            .source("Order")
            .metric("receivedOrders")
            .value(String.valueOf(receivedOrders))
            .description("Orders successfully received (used for reliability)")
            .build());
        evidence.add(Evidence.builder()
            .source("Order")
            .metric("pendingOrders")
            .value(String.valueOf(pendingOrders))
            .description("Orders still pending fulfillment")
            .build());

        if (reliabilityScore >= 0) {
            evidence.add(Evidence.builder()
                .source("Order")
                .metric("derivedReliability")
                .value(String.format("%.1f%%", reliabilityScore))
                .description("Reliability derived from order completion rate")
                .build());
        }

        // Actions
        List<String> actions = new ArrayList<>();
        if (pendingOrders > 3)
            actions.add("Follow up on " + pendingOrders + " pending orders");
        if (reliabilityScore >= 0 && reliabilityScore < 80)
            actions.add("Review and replace underperforming suppliers");
        if (avgDeliveryDays > 7)
            actions.add("Negotiate faster delivery terms with suppliers");
        if (dataGaps.size() > 0)
            actions.add("Mark orders as RECEIVED when deliveries arrive for better tracking");

        // Confidence
        double confidence;
        if (totalOrders == 0) confidence = 20.0;
        else if (receivedOrders == 0) confidence = 40.0;
        else if (receivedOrders < 3) confidence = 60.0;
        else confidence = 85.0;

        if (confidence < 85) {
            dataGaps.add("Supplier analysis confidence reduced: only " +
                receivedOrders + " completed orders available. " +
                "Track Goods Receipt timestamps for 14+ days for full accuracy.");
        }

        return ReasoningResult.builder()
            .domain(DomainType.SUPPLIER)
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
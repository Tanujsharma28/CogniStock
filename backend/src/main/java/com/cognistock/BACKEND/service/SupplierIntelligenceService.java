package com.cognistock.backend.service;

import com.cognistock.backend.dto.response.SupplierIntelligenceDTO;
import com.cognistock.backend.entity.Order;
import com.cognistock.backend.entity.Order.OrderStatus;
import com.cognistock.backend.entity.Supplier;
import com.cognistock.backend.repository.OrderRepository;
import com.cognistock.backend.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupplierIntelligenceService {

    private final SupplierRepository supplierRepository;
    private final OrderRepository    orderRepository;
    private final WarningService     warningService;

    // ── PUBLIC: analyze() ────────────────────────────────────────────────
    public List<SupplierIntelligenceDTO> analyze() {
        List<Supplier> suppliers = supplierRepository.findAll();

        // ONE batch query — all orders with supplier loaded
        Map<Long, List<Order>> ordersBySupplier = buildOrdersBySupplierMap();

        return suppliers.stream()
            .map(s -> buildIntelligenceFromOrders(s,
                ordersBySupplier.getOrDefault(s.getId(), List.of())))
            .sorted((a, b) -> Double.compare(
                b.getReliabilityScore() != null ? b.getReliabilityScore() : 0,
                a.getReliabilityScore() != null ? a.getReliabilityScore() : 0))
            .toList();
    }

    // ── PUBLIC: getRecommendations() ─────────────────────────────────────
    public List<Map<String, Object>> getRecommendations() {

        // Step 1 — warnings (already optimized: 3 DB calls)
        List<Map<String, Object>> warnings = warningService.getWarnings();

        // Step 2 — pre-compute supplier intelligence for ALL suppliers
        //          (1 + 1 DB calls — reused below, no repeated buildIntelligence)
        List<Supplier> allSuppliers = supplierRepository.findAll();
        Map<Long, List<Order>> ordersBySupplier = buildOrdersBySupplierMap();

        Map<Long, SupplierIntelligenceDTO> intelMap = allSuppliers.stream()
            .collect(Collectors.toMap(
                Supplier::getId,
                s -> buildIntelligenceFromOrders(s,
                    ordersBySupplier.getOrDefault(s.getId(), List.of()))
            ));

        // Step 3 — batch product→supplier mappings (1 DB call)
        Map<Long, List<Supplier>> suppliersByProduct = buildSuppliersByProductMap();

        // Step 4 — build recommendations using pre-loaded data (0 DB calls)
        List<Map<String, Object>> recommendations = new ArrayList<>();

        for (Map<String, Object> warning : warnings) {
            String riskLevel = (String) warning.get("riskLevel");
            if ("DEAD_STOCK".equals(riskLevel)) continue;

            Long   productId       = ((Number) warning.get("productId")).longValue();
            String productName     = (String)  warning.get("productName");
            int    currentStock    = ((Number) warning.get("currentStock")).intValue();
            int    daysUntilStockout = ((Number) warning.get("daysUntilStockout")).intValue();
            double dailyDemand     = ((Number) warning.get("dailyDemand")).doubleValue();

            List<Supplier> historicalSuppliers =
                suppliersByProduct.getOrDefault(productId, List.of());

            if (historicalSuppliers.isEmpty()) {
                Map<String, Object> rec = new LinkedHashMap<>();
                rec.put("productId",         productId);
                rec.put("productName",       productName);
                rec.put("riskLevel",         riskLevel);
                rec.put("currentStock",      currentStock);
                rec.put("daysUntilStockout", daysUntilStockout);
                rec.put("recommendedSupplier", null);
                rec.put("suggestedOrderQty", suggestQty(dailyDemand, daysUntilStockout));
                rec.put("reasoning", "No historical supplier found for " + productName +
                                     ". Manually assign a supplier before reordering.");
                rec.put("actionable", false);
                recommendations.add(rec);
                continue;
            }

            // Best supplier — score karo (same logic as before)
            Supplier best = historicalSuppliers.stream()
                .max(Comparator.comparingDouble(this::scoreSupplier))
                .orElse(historicalSuppliers.get(0));

            // Reuse pre-computed intel — NO extra DB call
            SupplierIntelligenceDTO intel = intelMap.get(best.getId());
            if (intel == null) {
                // Fallback: supplier exists in orders but not in supplier table
                intel = buildIntelligenceFromOrders(best,
                    ordersBySupplier.getOrDefault(best.getId(), List.of()));
            }

            Map<String, Object> supplierMap = new LinkedHashMap<>();
            supplierMap.put("supplierId",       best.getId());
            supplierMap.put("name",             best.getName());
            supplierMap.put("reliabilityScore", intel.getReliabilityScore());
            supplierMap.put("deliveryDays",     best.getDeliveryDays());
            supplierMap.put("onTimeRate",       intel.getOnTimeRate());
            supplierMap.put("riskLevel",        intel.getRiskLevel());

            int suggestedQty = suggestQty(dailyDemand, daysUntilStockout);

            String reasoning = buildRecommendationReasoning(
                productName, riskLevel, daysUntilStockout,
                best.getName(), intel.getReliabilityScore(),
                best.getDeliveryDays(), intel.getOnTimeRate(), suggestedQty);

            Map<String, Object> rec = new LinkedHashMap<>();
            rec.put("productId",           productId);
            rec.put("productName",         productName);
            rec.put("riskLevel",           riskLevel);
            rec.put("currentStock",        currentStock);
            rec.put("daysUntilStockout",   daysUntilStockout);
            rec.put("recommendedSupplier", supplierMap);
            rec.put("suggestedOrderQty",   suggestedQty);
            rec.put("reasoning",           reasoning);
            rec.put("actionable",          true);
            recommendations.add(rec);
        }

        recommendations.sort((a, b) -> severityOrder((String) a.get("riskLevel"))
            - severityOrder((String) b.get("riskLevel")));

        return recommendations;
    }

    // ── PRIVATE: batch helpers ────────────────────────────────────────────

    /**
     * ONE DB call — fetches all orders with supplier eagerly loaded,
     * groups by supplierId. Replaces N×findBySupplierId calls.
     */
    private Map<Long, List<Order>> buildOrdersBySupplierMap() {
        return orderRepository.findAllWithSupplier().stream()
            .filter(o -> o.getSupplier() != null)
            .collect(Collectors.groupingBy(o -> o.getSupplier().getId()));
    }

    /**
     * ONE DB call — fetches all product→supplier mappings,
     * groups by productId. Replaces N×findSuppliersByProductId calls.
     */
    private Map<Long, List<Supplier>> buildSuppliersByProductMap() {
        List<Object[]> rows = orderRepository.findProductSupplierMappings();
        Map<Long, List<Supplier>> map = new HashMap<>();
        for (Object[] row : rows) {
            Long     productId = ((Number) row[0]).longValue();
            Supplier supplier  = (Supplier) row[1];
            map.computeIfAbsent(productId, k -> new ArrayList<>()).add(supplier);
        }
        return map;
    }

    // ── PRIVATE: buildIntelligenceFromOrders ─────────────────────────────
    // Replaces buildIntelligence(Supplier) — accepts pre-loaded orders,
    // zero DB calls. All computation logic identical to original.

    private SupplierIntelligenceDTO buildIntelligenceFromOrders(
            Supplier s, List<Order> orders) {

        long total     = orders.size();
        long received  = orders.stream()
            .filter(o -> o.getStatus() == OrderStatus.RECEIVED).count();
        long pending   = orders.stream()
            .filter(o -> o.getStatus() == OrderStatus.PENDING).count();
        long cancelled = orders.stream()
            .filter(o -> o.getStatus() == OrderStatus.CANCELLED).count();

        double onTimeRate = total > 0
            ? Math.round((received / (double) total) * 100 * 10.0) / 10.0
            : 0.0;

        double reliability = s.getReliabilityScore() != null ? s.getReliabilityScore() : 0;
        int    delivery    = s.getDeliveryDays()     != null ? s.getDeliveryDays()     : 99;
        double price       = s.getPricePerUnit()     != null ? s.getPricePerUnit()     : 0;

        String riskLevel      = computeRisk(reliability, onTimeRate, pending, total);
        String recommendation = buildRecommendation(
            s.getName(), reliability, delivery, price, onTimeRate, pending, total);

        return SupplierIntelligenceDTO.builder()
            .supplierId(s.getId())
            .name(s.getName())
            .deliveryDays(s.getDeliveryDays())
            .pricePerUnit(price)
            .reliabilityScore(reliability)
            .totalOrders(total)
            .receivedOrders(received)
            .pendingOrders(pending)
            .cancelledOrders(cancelled)
            .onTimeRate(onTimeRate)
            .riskLevel(riskLevel)
            .aiRecommendation(recommendation)
            .build();
    }

    // ── PRIVATE: unchanged logic methods ─────────────────────────────────

    private String computeRisk(double reliability, double onTimeRate,
                               long pending, long total) {
        double pendingRatio = total > 0 ? (double) pending / total : 0;
        if (reliability >= 85 && onTimeRate >= 50 && pendingRatio < 0.5) return "LOW";
        if (reliability >= 65 && pendingRatio < 0.7)                     return "MEDIUM";
        return "HIGH";
    }

    private String buildRecommendation(
            String name, double reliability, int delivery,
            double price, double onTimeRate, long pending, long total) {
        if (pending > 3 && onTimeRate == 0.0 && total > 1)
            return "High risk — " + pending + " pending orders with 0% fulfillment rate. Escalate immediately.";
        if (reliability >= 90 && delivery <= 3 && onTimeRate >= 40)
            return "Preferred supplier — high reliability and fast delivery.";
        if (reliability >= 85 && onTimeRate >= 30 && pending <= 2)
            return "Reliable supplier — good for regular restocking.";
        if (delivery <= 2 && onTimeRate >= 25)
            return "Fast delivery supplier — use for urgent orders.";
        if (reliability < 65)
            return "High risk — low reliability score. Use only if no alternatives.";
        if (pending > 3)
            return "Caution — " + pending + " pending orders unresolved. Follow up required.";
        return "Average supplier — monitor performance before increasing order volume.";
    }

    private double scoreSupplier(Supplier s) {
        double reliability = s.getReliabilityScore() != null ? s.getReliabilityScore() : 0;
        double delivery    = s.getDeliveryDays()     != null ? s.getDeliveryDays()     : 99;
        return reliability - (delivery * 0.5);
    }

    private int suggestQty(double dailyDemand, int daysUntilStockout) {
        return (int) Math.ceil(dailyDemand * 30);
    }

    private String buildRecommendationReasoning(
            String product, String risk, int days,
            String supplierName, double reliability,
            Integer delivery, double onTimeRate, int qty) {
        String urgency = switch (risk) {
            case "CRITICAL" -> days == 0
                ? product + " is OUT OF STOCK."
                : product + " stockout in " + days + " day(s).";
            case "HIGH"     -> product + " critically low — " + days + " days left.";
            default         -> product + " stock running low.";
        };
        return urgency + " " + supplierName + " recommended — reliability " +
            (int) reliability + ", " +
            (delivery != null ? delivery + "-day delivery" : "delivery unknown") +
            ", " + (int) onTimeRate + "% fulfillment rate." +
            " Suggested order: " + qty + " units.";
    }

    private int severityOrder(String risk) {
        return switch (risk) {
            case "CRITICAL" -> 0;
            case "HIGH"     -> 1;
            case "MEDIUM"   -> 2;
            default         -> 3;
        };
    }
}
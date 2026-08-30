package com.cognistock.backend.service;

import com.cognistock.backend.entity.Product;
import com.cognistock.backend.entity.SalesRecord;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.repository.SalesRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WarningService {

    private final ProductRepository productRepository;
    private final SalesRecordRepository salesRecordRepository;
    private final ForecastService forecastService;

    public List<Map<String, Object>> getWarnings() {
        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysAgo = today.minusDays(30);

        // ── 1. Fetch all products ─────────────────────────────────────────────
        List<Product> allProducts = productRepository.findAll();

        // ── 2. Dead stock set ─────────────────────────────────────────────────
        Set<Long> deadStockIds = new HashSet<>();
        salesRecordRepository.findDeadStockSince(thirtyDaysAgo)
            .forEach(p -> deadStockIds.add(p.getId()));

        // ── 3. ONE batch sales query for all products ─────────────────────────
        List<Long> productIds = allProducts.stream()
            .map(Product::getId)
            .toList();

        Map<Long, List<SalesRecord>> salesByProduct = salesRecordRepository
            .findByProductIdInOrderBySaleDateDesc(productIds)
            .stream()
            .collect(Collectors.groupingBy(r -> r.getProduct().getId()));

        // ── 4. Build warnings using pre-loaded data ───────────────────────────
        List<Map<String, Object>> warnings = new ArrayList<>();

        for (Product product : allProducts) {
            try {
                List<SalesRecord> records = salesByProduct
                    .getOrDefault(product.getId(), List.of());

                Map<String, Object> warning = buildWarning(
                    product, today, thirtyDaysAgo, deadStockIds, records);

                if (warning != null) {
                    warnings.add(warning);
                }
            } catch (Exception e) {
                log.warn("Warning build failed for productId={}: {}",
                    product.getId(), e.getMessage());
            }
        }

        warnings.sort(Comparator.comparingInt(
            w -> severityOrder((String) w.get("riskLevel"))));
        return warnings;
    }

    private Map<String, Object> buildWarning(
            Product product, LocalDate today, LocalDate thirtyDaysAgo,
            Set<Long> deadStockIds, List<SalesRecord> records) {   // ← records param added

        Long productId = product.getId();
        int stock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        double price = product.getPrice() != null ? product.getPrice() : 0.0;
        int threshold = product.getReorderThreshold() != null ? product.getReorderThreshold() : 0;

        // ── Pre-loaded records use karo — NO DB call ──────────────────────────
        // (was: salesRecordRepository.findByProductIdOrderBySaleDateDesc(productId))
        List<SalesRecord> last30 = records.stream()
            .filter(r -> !r.getSaleDate().isBefore(thirtyDaysAgo))
            .toList();
        double totalSold = last30.stream().mapToInt(SalesRecord::getQuantitySold).sum();
        double dailyDemand = totalSold / 30.0;

        // ── Forecast — pass pre-loaded data, skip internal DB calls ──────────
        String stockoutDate = null;
        String trend = "STABLE";
        double confidence = 0.0;

        try {
            Object forecastRaw = forecastService.getForecastWithHistory(
                productId, records, product);                      // ← new overload
            if (forecastRaw instanceof Map<?, ?> forecastMap) {
                Object sod = forecastMap.get("stockoutDate");
                if (sod != null && !sod.toString().isEmpty()) {
                    stockoutDate = sod.toString();
                }
                Object tr = forecastMap.get("trend");
                if (tr != null) trend = tr.toString();
                Object conf = forecastMap.get("confidence");
                if (conf instanceof Number) confidence = ((Number) conf).doubleValue();
            }
        } catch (Exception e) {
            log.warn("Forecast unavailable for productId={}, using sales-based demand", productId);
        }

        // Days until stockout — with stale forecast correction
        int daysUntilStockout = -1;
        if (stockoutDate != null) {
            try {
                LocalDate sod = LocalDate.parse(stockoutDate);
                long days = ChronoUnit.DAYS.between(today, sod);
                if (days < 0) {
                    // Stale forecast — stockoutDate is in the past
                    if (stock == 0) {
                        daysUntilStockout = 0;
                    } else if (dailyDemand > 0.1) {
                        // Recalculate from current stock
                        daysUntilStockout = (int)(stock / dailyDemand);
                    } else {
                        // No demand — ignore stale forecast
                        daysUntilStockout = -1;
                    }
                } else {
                    daysUntilStockout = (int) days;
                }
            } catch (Exception e) {
                log.warn("Could not parse stockoutDate={}", stockoutDate);
            }
        }

        // Revenue at risk — capped at 30 day horizon
        double revenueAtRisk = 0.0;
        if (daysUntilStockout >= 0) {
            int safeDays = Math.min(daysUntilStockout, 30);
            int riskyDays = 30 - safeDays;
            revenueAtRisk = riskyDays * dailyDemand * price;
        }

        // Capital locked for dead stock
        double capitalLocked = deadStockIds.contains(productId) ? stock * price : 0.0;

        // Risk classification
        boolean isDeadStock = deadStockIds.contains(productId);
        String riskLevel;
        String riskType;
        String recommendedAction;
        String actionTarget;

        if (stock == 0) {
            riskLevel = "CRITICAL";
            riskType = "OUT_OF_STOCK";
            recommendedAction = "Product is out of stock. Raise emergency PO immediately.";
            actionTarget = "AI_INSIGHTS";
        } else if (daysUntilStockout >= 0 && daysUntilStockout <= 3) {
            riskLevel = "CRITICAL";
            riskType = "STOCKOUT_IMMINENT";
            recommendedAction = "Stockout in " + daysUntilStockout + " day(s). Raise PO immediately.";
            actionTarget = "AI_INSIGHTS";
        } else if (daysUntilStockout >= 0 && daysUntilStockout <= 7) {
            riskLevel = "HIGH";
            riskType = "STOCKOUT_SOON";
            recommendedAction = "Stockout in " + daysUntilStockout + " days. Plan reorder this week.";
            actionTarget = "AI_INSIGHTS";
        } else if (isDeadStock && stock > 0) {
            riskLevel = "DEAD_STOCK";
            riskType = "NO_MOVEMENT";
            recommendedAction = "No sales in 30 days. Consider recovery pricing or liquidation.";
            actionTarget = "AI_INSIGHTS";
        } else if (stock <= threshold && "DECLINING".equals(trend)) {
            riskLevel = "MEDIUM";
            riskType = "LOW_STOCK_DECLINING";
            recommendedAction = "Low stock with declining demand. Monitor and reduce future procurement.";
            actionTarget = "AI_INSIGHTS";
        } else if (stock <= threshold) {
            riskLevel = "MEDIUM";
            riskType = "LOW_STOCK";
            recommendedAction = "Stock below reorder threshold. Schedule restocking.";
            actionTarget = "AI_INSIGHTS";
        } else {
            return null;
        }

        Map<String, Object> warning = new LinkedHashMap<>();
        warning.put("productId", productId);
        warning.put("productName", product.getName());
        warning.put("sku", product.getSku());
        warning.put("riskLevel", riskLevel);
        warning.put("riskType", riskType);
        warning.put("currentStock", stock);
        warning.put("reorderThreshold", threshold);
        warning.put("dailyDemand", Math.round(dailyDemand * 100.0) / 100.0);
        warning.put("daysUntilStockout", daysUntilStockout);
        warning.put("stockoutDate", stockoutDate);
        warning.put("revenueAtRisk", Math.round(revenueAtRisk * 100.0) / 100.0);
        warning.put("capitalLocked", Math.round(capitalLocked * 100.0) / 100.0);
        warning.put("trend", trend);
        warning.put("confidence", confidence);
        warning.put("recommendedAction", recommendedAction);
        warning.put("actionTarget", actionTarget);
        return warning;
    }

    private int severityOrder(String riskLevel) {
        return switch (riskLevel) {
            case "CRITICAL"   -> 0;
            case "HIGH"       -> 1;
            case "MEDIUM"     -> 2;
            case "DEAD_STOCK" -> 3;
            default           -> 4;
        };
    }
}
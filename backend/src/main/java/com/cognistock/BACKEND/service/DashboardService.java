package com.cognistock.backend.service;

import com.cognistock.backend.entity.Product;
import com.cognistock.backend.repository.OrderRepository;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.repository.SalesRecordRepository;
import com.cognistock.backend.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final SupplierRepository supplierRepository;
    private final SalesRecordRepository salesRecordRepository;

    public Map<String, Object> getSummary() {
        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysAgo = today.minusDays(30);
        LocalDate sevenDaysAgo = today.minusDays(7);

        List<Product> allProducts = productRepository.findAll();

        // Stock counts
        long totalProducts = allProducts.size();
        long lowStock = allProducts.stream()
            .filter(p -> p.getStockQuantity() <= p.getReorderThreshold())
            .count();
        long criticalStock = allProducts.stream()
            .filter(p -> p.getStockQuantity() == 0)
            .count();
        long healthyStock = totalProducts - lowStock;

        // Revenue
        Double revenue30Days = salesRecordRepository
            .getTotalRevenueBetween(thirtyDaysAgo, today);
        Double revenue7Days = salesRecordRepository
            .getTotalRevenueBetween(sevenDaysAgo, today);

        // Orders
        long totalOrders = orderRepository.count();
        long totalSuppliers = supplierRepository.count();

        // Dead stock
        List<Product> deadStock = salesRecordRepository
            .findDeadStockSince(thirtyDaysAgo);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalProducts", totalProducts);
        summary.put("lowStockCount", lowStock);
        summary.put("criticalStockCount", criticalStock);
        summary.put("healthyStockCount", healthyStock);
        summary.put("totalOrders", totalOrders);
        summary.put("totalSuppliers", totalSuppliers);
        summary.put("revenue30Days", round(revenue30Days));
        summary.put("revenue7Days", round(revenue7Days));
        summary.put("deadStockCount", deadStock.size());
        summary.put("generatedAt", today);
        return summary;
    }

    public Map<String, Object> getRevenueSummary() {
        LocalDate today = LocalDate.now();

        List<Object[]> monthly = salesRecordRepository.getMonthlyRevenue();
        List<Object[]> daily30 = salesRecordRepository
            .getDailyRevenueTrend(today.minusDays(30), today);

        List<Map<String, Object>> monthlyList = monthly.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("year", row[0]);
            m.put("month", row[1]);
            m.put("revenue", round((Double) row[2]));
            return m;
        }).toList();

        List<Map<String, Object>> dailyList = daily30.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("date", row[0]);
            m.put("revenue", round((Double) row[1]));
            return m;
        }).toList();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("monthly", monthlyList);
        result.put("daily30Days", dailyList);
        result.put("totalRevenue30Days", round(
            salesRecordRepository.getTotalRevenueBetween(today.minusDays(30), today)));
        result.put("totalRevenue7Days", round(
            salesRecordRepository.getTotalRevenueBetween(today.minusDays(7), today)));
        return result;
    }

    public Map<String, Object> getBusinessHealth() {
        List<Product> all = productRepository.findAll();
        LocalDate today = LocalDate.now();

        long total = all.size();
        long low = all.stream()
            .filter(p -> p.getStockQuantity() <= p.getReorderThreshold()).count();
        long critical = all.stream()
            .filter(p -> p.getStockQuantity() == 0).count();
        long dead = salesRecordRepository.findDeadStockSince(
            today.minusDays(30)).size();

        // Health score (0-100)
        double stockScore = total > 0 ? ((double)(total - low) / total) * 40 : 40;
        double criticalPenalty = total > 0 ? ((double) critical / total) * 20 : 0;
        double deadPenalty = total > 0 ? ((double) dead / total) * 10 : 0;
        double revenueScore = 30; // base — improve when more data

        double healthScore = Math.max(0,
            Math.min(100, stockScore - criticalPenalty - deadPenalty + revenueScore));

        String healthLabel;
        if (healthScore >= 80) healthLabel = "EXCELLENT";
        else if (healthScore >= 60) healthLabel = "GOOD";
        else if (healthScore >= 40) healthLabel = "FAIR";
        else healthLabel = "CRITICAL";

        Map<String, Object> health = new LinkedHashMap<>();
        health.put("score", round(healthScore));
        health.put("label", healthLabel);
        health.put("stockHealthPercent", round(((double)(total - low) / total) * 100));
        health.put("criticalItems", critical);
        health.put("deadStockItems", dead);
        health.put("lowStockItems", low);
        health.put("totalProducts", total);
        return health;
    }

    public Map<String, Object> getAlerts() {
        List<Product> all = productRepository.findAll();
        LocalDate today = LocalDate.now();

        List<Map<String, Object>> alerts = new ArrayList<>();

        // Low stock alerts
        all.stream()
            .filter(p -> p.getStockQuantity() <= p.getReorderThreshold()
                      && p.getStockQuantity() > 0)
            .forEach(p -> {
                Map<String, Object> alert = new LinkedHashMap<>();
                alert.put("type", "LOW_STOCK");
                alert.put("severity", "WARNING");
                alert.put("productId", p.getId());
                alert.put("productName", p.getName());
                alert.put("message", p.getName() + " stock is low: "
                    + p.getStockQuantity() + " remaining");
                alerts.add(alert);
            });

        // Critical stock alerts
        all.stream()
            .filter(p -> p.getStockQuantity() == 0)
            .forEach(p -> {
                Map<String, Object> alert = new LinkedHashMap<>();
                alert.put("type", "OUT_OF_STOCK");
                alert.put("severity", "CRITICAL");
                alert.put("productId", p.getId());
                alert.put("productName", p.getName());
                alert.put("message", p.getName() + " is OUT OF STOCK");
                alerts.add(alert);
            });

        // Dead stock alerts
        salesRecordRepository.findDeadStockSince(today.minusDays(30))
            .forEach(p -> {
                Map<String, Object> alert = new LinkedHashMap<>();
                alert.put("type", "DEAD_STOCK");
                alert.put("severity", "INFO");
                alert.put("productId", p.getId());
                alert.put("productName", p.getName());
                alert.put("message", p.getName()
                    + " has no sales in last 30 days (stock: "
                    + p.getStockQuantity() + ")");
                alerts.add(alert);
            });

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalAlerts", alerts.size());
        result.put("critical", alerts.stream()
            .filter(a -> "CRITICAL".equals(a.get("severity"))).count());
        result.put("warnings", alerts.stream()
            .filter(a -> "WARNING".equals(a.get("severity"))).count());
        result.put("info", alerts.stream()
            .filter(a -> "INFO".equals(a.get("severity"))).count());
        result.put("alerts", alerts);
        return result;
    }

    public Object getTopProducts() {
        LocalDate today = LocalDate.now();
        List<Object[]> top = salesRecordRepository
            .getTopProductsBetween(today.minusDays(30), today);

        return top.stream().map(row -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("productId", row[0]);
            m.put("productName", row[1]);
            m.put("totalQuantitySold", row[2]);
            m.put("totalRevenue", round((Double) row[3]));
            return m;
        }).toList();
    }

    private double round(Double value) {
        if (value == null) return 0.0;
        return BigDecimal.valueOf(value)
            .setScale(2, RoundingMode.HALF_UP)
            .doubleValue();
    }
}
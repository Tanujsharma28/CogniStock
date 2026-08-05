package com.cognistock.backend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Comparator;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.cognistock.backend.entity.Product;
import com.cognistock.backend.entity.AIRecommendationLog;
import com.cognistock.backend.repository.OrderRepository;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.repository.AIRecommendationLogRepository;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private AIRecommendationLogRepository aiLogRepository;

    @GetMapping("/summary")
    public Map<String, Object> getSummary() {
        List<Product> products = productRepository.findAll();

        double totalStockValue = products.stream()
            .mapToDouble(p -> (p.getPrice() != null ? p.getPrice() : 0)
                * (p.getStockQuantity() != null ? p.getStockQuantity() : 0))
            .sum();

        long lowStockCount = products.stream()
            .filter(p -> p.getStockQuantity() != null && p.getReorderThreshold() != null
                && p.getStockQuantity() <= p.getReorderThreshold())
            .count();

        long totalOrders = orderRepository.count();

        // Sabse low stock wala product (for dashboard cards)
        Product lowestStockProduct = products.stream()
            .filter(p -> p.getStockQuantity() != null && p.getReorderThreshold() != null
                && p.getStockQuantity() <= p.getReorderThreshold())
            .min(Comparator.comparingInt(Product::getStockQuantity))
            .orElse(products.isEmpty() ? null : products.get(0));

        Long lowStockProductId = lowestStockProduct != null ? lowestStockProduct.getId() : 1L;

        // AI approval rate
        List<AIRecommendationLog> allLogs = aiLogRepository.findAll();
        long decided = allLogs.stream()
            .filter(l -> l.getDecisionStatus().equals("APPROVED") 
                || l.getDecisionStatus().equals("REJECTED"))
            .count();
        long approved = allLogs.stream()
            .filter(l -> l.getDecisionStatus().equals("APPROVED"))
            .count();

        double aiApprovalRate = decided > 0 
            ? Math.round((approved * 100.0 / decided) * 10.0) / 10.0 
            : 0;

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalStockValue", totalStockValue);
        summary.put("lowStockCount", lowStockCount);
        summary.put("totalOrders", totalOrders);
        summary.put("lowStockProductId", lowStockProductId);
        summary.put("aiApprovalRate", aiApprovalRate);

        return summary;
    }
}
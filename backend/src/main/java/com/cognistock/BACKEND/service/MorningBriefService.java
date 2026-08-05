package com.cognistock.backend.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.cognistock.backend.entity.AIRecommendationLog;
import com.cognistock.backend.entity.Order;
import com.cognistock.backend.entity.Product;
import com.cognistock.backend.entity.Supplier;
import com.cognistock.backend.repository.AIRecommendationLogRepository;
import com.cognistock.backend.repository.OrderRepository;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.repository.SupplierRepository;

@Service
public class MorningBriefService {

    @Autowired private ProductRepository productRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private AIRecommendationLogRepository aiLogRepository;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, Object> generate() {
        // Live data collect karo
        List<Product> products = productRepository.findAll();
        List<Order> orders = orderRepository.findAll();
        List<Supplier> suppliers = supplierRepository.findAll();
        List<AIRecommendationLog> aiLogs = aiLogRepository.findAll();

        // Metrics calculate karo
        double totalInventoryValue = products.stream()
            .mapToDouble(p -> p.getPrice() * p.getStockQuantity())
            .sum();

        List<Product> lowStockProducts = products.stream()
            .filter(p -> p.getStockQuantity() <= p.getReorderThreshold())
            .sorted(Comparator.comparingInt(Product::getStockQuantity))
            .collect(Collectors.toList());

        long totalOrders = orders.size();
        long pendingOrders = orders.stream()
            .filter(o -> "PENDING".equals(o.getStatus())).count();

        long pendingAI = aiLogs.stream()
            .filter(l -> "PENDING".equals(l.getDecisionStatus())).count();
        long approvedAI = aiLogs.stream()
            .filter(l -> "APPROVED".equals(l.getDecisionStatus())).count();
        long totalDecided = aiLogs.stream()
            .filter(l -> !"PENDING".equals(l.getDecisionStatus())).count();
        double aiAccuracy = totalDecided > 0
            ? Math.round(approvedAI * 100.0 / totalDecided * 10) / 10.0 : 0;

        // Health score calculate karo
        int inventoryHealth = lowStockProducts.size() == 0 ? 100
            : Math.max(0, 100 - (lowStockProducts.size() * 10));
        int orderHealth = (int) (pendingOrders == 0 ? 100
            : Math.max(0, 100 - (pendingOrders * 5)));
        int aiHealth = (int) aiAccuracy;
        int overallHealth = (inventoryHealth + orderHealth + aiHealth + 85) / 4;

        // Brief ID
        String briefId = "MB-" + LocalDateTime.now()
            .format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm"));
        String generatedAt = LocalDateTime.now()
            .format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));

        // Gemini se insights lo
        String geminiInsights = getGeminiInsights(
            products, lowStockProducts, orders, suppliers, aiLogs,
            totalInventoryValue, pendingOrders, pendingAI
        );

        // Response build karo
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("briefId", briefId);
        response.put("generatedAt", generatedAt);
        response.put("overallHealth", overallHealth);

        // Snapshot
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("inventoryValue", Math.round(totalInventoryValue));
        snapshot.put("totalOrders", totalOrders);
        snapshot.put("pendingOrders", pendingOrders);
        snapshot.put("lowStockCount", lowStockProducts.size());
        snapshot.put("totalProducts", products.size());
        response.put("snapshot", snapshot);

        // Health scores
        Map<String, Object> health = new LinkedHashMap<>();
        health.put("inventory", inventoryHealth);
        health.put("orders", orderHealth);
        health.put("aiAccuracy", aiHealth == 0 ? 85 : aiHealth);
        health.put("suppliers", 84);
        health.put("overall", overallHealth);
        response.put("healthScores", health);

        // Low stock alerts
        List<Map<String, Object>> alerts = lowStockProducts.stream()
            .limit(5)
            .map(p -> {
                Map<String, Object> alert = new LinkedHashMap<>();
                alert.put("product", p.getName());
                alert.put("stock", p.getStockQuantity());
                alert.put("threshold", p.getReorderThreshold());
                int daysLeft = p.getStockQuantity() > 0
                    ? Math.max(1, p.getStockQuantity() / 2) : 0;
                alert.put("daysLeft", daysLeft);
                alert.put("severity", p.getStockQuantity() <= 3 ? "CRITICAL"
                    : p.getStockQuantity() <= 8 ? "HIGH" : "MEDIUM");
                return alert;
            })
            .collect(Collectors.toList());
        response.put("criticalAlerts", alerts);

        // Pending AI decisions
        response.put("pendingAIDecisions", pendingAI);
        response.put("aiInsights", geminiInsights);

        return response;
    }

    private String getGeminiInsights(
            List<Product> products, List<Product> lowStock,
            List<Order> orders, List<Supplier> suppliers,
            List<AIRecommendationLog> aiLogs,
            double inventoryValue, long pendingOrders, long pendingAI) {

     String url = "https://generativelanguage.googleapis.com/v1beta/models/" +
    "gemini-flash-latest:generateContent?key=" + geminiApiKey;

        String prompt = String.format("""
            You are a senior business intelligence AI for CogniStock inventory system.
            Generate a concise CEO morning brief with exactly these sections:
            
            1. TOP_OPPORTUNITY: One specific business opportunity (1-2 sentences)
            2. KEY_RISKS: 2-3 key risks right now (bullet points)
            3. ACTION_PLAN: Top 3 priority actions for today (numbered)
            4. BUSINESS_INSIGHT: One sharp insight about the business (1-2 sentences)
            
            Use this live data:
            - Total products: %d
            - Low stock products: %s
            - Total inventory value: ₹%.0f
            - Pending orders: %d
            - Pending AI decisions: %d
            - Suppliers: %d
            
            Be specific, use numbers, be actionable. No fluff.
            Format response as JSON with keys: topOpportunity, keyRisks (array), actionPlan (array), businessInsight
            Return ONLY valid JSON, no markdown.
            """,
            products.size(),
            lowStock.stream().map(Product::getName).collect(Collectors.joining(", ")),
            inventoryValue,
            pendingOrders,
            pendingAI,
            suppliers.size()
        );

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(Map.of("text", prompt)))
            )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                url, new HttpEntity<>(requestBody, headers), Map.class);
            List candidates = (List) response.getBody().get("candidates");
            Map candidate = (Map) candidates.get(0);
            Map content = (Map) candidate.get("content");
            List parts = (List) content.get("parts");
            return (String) ((Map) parts.get(0)).get("text");
        }  catch (Exception e) {
    org.slf4j.LoggerFactory.getLogger(MorningBriefService.class)
        .error("Gemini API call failed: {}", e.getMessage(), e);
    return "{\"topOpportunity\":\"Review pending AI decisions to optimize operations.\","
        + "\"keyRisks\":[\"Low stock on critical items\",\"Pending orders need attention\"],"
        + "\"actionPlan\":[\"Review low stock alerts\",\"Approve pending AI decisions\",\"Check supplier status\"],"
        + "\"businessInsight\":\"Inventory optimization can improve margins significantly.\"}";
}
    }
}

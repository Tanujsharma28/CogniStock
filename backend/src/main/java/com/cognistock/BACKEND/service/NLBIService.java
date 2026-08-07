package com.cognistock.backend.service;

import com.cognistock.backend.entity.Product;
import com.cognistock.backend.entity.AIRecommendationLog;
import com.cognistock.backend.repository.AIRecommendationLogRepository;
import com.cognistock.backend.repository.OrderRepository;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.repository.SupplierRepository;
import com.cognistock.backend.entity.Supplier;
import com.cognistock.backend.entity.Order;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class NLBIService {

    @Autowired private ProductRepository productRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private SupplierRepository supplierRepository;
    @Autowired private AIRecommendationLogRepository aiLogRepository;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String answer(String question) {
        // Step 1: DB se live data collect karo
        List<Product> products = productRepository.findAll();
        List<Order> orders = orderRepository.findAll();
        List<Supplier> suppliers = supplierRepository.findAll();
        List<AIRecommendationLog> aiLogs = aiLogRepository.findAll();

        // Step 2: Context string banao
        String context = buildContext(products, orders, suppliers, aiLogs);

        // Step 3: Gemini ko bhejo
        return askGemini(question, context);
    }

    private String buildContext(List<Product> products, List<Order> orders,
                                 List<Supplier> suppliers, List<AIRecommendationLog> aiLogs) {
        StringBuilder sb = new StringBuilder();

        sb.append("=== INVENTORY DATA ===\n");
        for (Product p : products) {
            sb.append(String.format("Product: %s (SKU: %s) | Stock: %d | Threshold: %d | Price: ₹%.2f | Status: %s\n",
                p.getName(), p.getSku(), p.getStockQuantity(), p.getReorderThreshold(), p.getPrice(),
                p.getStockQuantity() <= p.getReorderThreshold() ? "LOW STOCK" : "In Stock"));
        }

        sb.append("\n=== ORDERS ===\n");
        sb.append("Total orders: ").append(orders.size()).append("\n");
        Map<String, Long> ordersByStatus = orders.stream()
    .collect(Collectors.groupingBy(
        o -> o.getStatus() != null ? o.getStatus().name() : "UNKNOWN",
        Collectors.counting()
    ));
        ordersByStatus.forEach((status, count) ->
            sb.append(status).append(": ").append(count).append(" orders\n"));

        sb.append("\n=== SUPPLIERS ===\n");
        for (Supplier s : suppliers) {
            sb.append(String.format("Supplier: %s | Delivery: %d days | Reliability: %.0f%% | Price/unit: ₹%.2f\n",
                s.getName(), s.getDeliveryDays(), s.getReliabilityScore(), s.getPricePerUnit()));
        }

        sb.append("\n=== AI DECISIONS ===\n");
        long pending = aiLogs.stream().filter(l -> "PENDING".equals(l.getDecisionStatus())).count();
        long approved = aiLogs.stream().filter(l -> "APPROVED".equals(l.getDecisionStatus())).count();
        long rejected = aiLogs.stream().filter(l -> "REJECTED".equals(l.getDecisionStatus())).count();
        sb.append(String.format("Total AI recommendations: %d | Approved: %d | Rejected: %d | Pending: %d\n",
            aiLogs.size(), approved, rejected, pending));

        return sb.toString();
    }

    private String askGemini(String question, String context) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey;

        String prompt = """
            You are CogniStock AI, a business intelligence assistant for an inventory management system.
            Answer the user's question using ONLY the data provided below.
            Be concise, specific, and use numbers from the data.
            Respond in the same language the user used (Hindi or English).
            Do not make up data. If the answer is not in the data, say so.
            
            === LIVE BUSINESS DATA ===
            """ + context + """
            
            User question: """ + question;

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(Map.of("text", prompt)))
            )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map body = response.getBody();
            List candidates = (List) body.get("candidates");
            Map candidate = (Map) candidates.get(0);
            Map content = (Map) candidate.get("content");
            List parts = (List) content.get("parts");
            Map part = (Map) parts.get(0);
            return (String) part.get("text");
        } catch (Exception e) {
            return "Unable to process your question right now. Please try again.";
        }
    }
}
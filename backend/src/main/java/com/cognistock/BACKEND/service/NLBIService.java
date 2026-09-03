package com.cognistock.backend.service;

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
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import com.cognistock.backend.entity.AIRecommendationLog;
import com.cognistock.backend.entity.Order;
import com.cognistock.backend.entity.Product;
import com.cognistock.backend.entity.Supplier;
import com.cognistock.backend.repository.AIRecommendationLogRepository;
import com.cognistock.backend.repository.OrderRepository;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.repository.SupplierRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
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
        List<Product> products = productRepository.findAll();
        List<Order> orders = orderRepository.findAll();
        List<Supplier> suppliers = supplierRepository.findAll();
        List<AIRecommendationLog> aiLogs = aiLogRepository.findAll();

        String context = buildContext(products, orders, suppliers, aiLogs);
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
        long pending  = aiLogs.stream().filter(l -> "PENDING".equals(l.getDecisionStatus())).count();
        long approved = aiLogs.stream().filter(l -> "APPROVED".equals(l.getDecisionStatus())).count();
        long rejected = aiLogs.stream().filter(l -> "REJECTED".equals(l.getDecisionStatus())).count();
        sb.append(String.format("Total AI recommendations: %d | Approved: %d | Rejected: %d | Pending: %d\n",
            aiLogs.size(), approved, rejected, pending));

        return sb.toString();
    }

    private String askGemini(String question, String context) {
String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" + geminiApiKey;        String prompt = """
    You are the CogniStock Intelligence Engine — an internal business-analytics assistant embedded in a retail inventory platform.

    STYLE RULES (follow strictly, every response):
    - Never use greetings or filler like "How can I assist you today?" or "I am CogniStock AI." Just answer.
    - Lead with the direct answer in the first sentence. Add supporting detail only if useful.
    - Never apologize or ask the user to rephrase. If data is missing, state that plainly in one line.
    - Do not use emoji, headings (#, ##, ###), or horizontal dividers (---).
    - You may use **bold** for key numbers/names and "-" bullet lists.
    - Keep bullet lines short and fact-dense, e.g. "- **Bluetooth Speaker** (SKU-1042): 1 unit, below threshold of 15."
       - Match the language of the user's question (Hindi, Hinglish, or English), but keep the same structural style regardless of language.
    - Sound like a precise internal analyst reporting to a manager, not a customer-support chatbot.
    - If the user's message is a short acknowledgment or greeting (e.g. "ok", "thanks", "cool", "hi") rather than an actual question, reply briefly and naturally (e.g. "Let me know if you need anything else.") — do NOT say a query wasn't provided.

    Answer ONLY using the live data below. Never invent numbers. If the answer isn't in the data, say so in one line.

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
    if (body == null) {
        log.error("Gemini API returned null body");
        return "Unable to process your question right now. Please try again.";
    }
    if (body.containsKey("error")) {
        Map<?, ?> error = (Map<?, ?>) body.get("error");
        log.error("Gemini API error: code={} message={}", error.get("code"), error.get("message"));
        return "Unable to process your question right now. Please try again.";
    }
    List candidates = (List) body.get("candidates");
    Map candidate = (Map) candidates.get(0);
    Map content = (Map) candidate.get("content");
    List parts = (List) content.get("parts");
    Map part = (Map) parts.get(0);
    return (String) part.get("text");
} catch (HttpClientErrorException | HttpServerErrorException e) {
    log.error("Gemini HTTP error: {} | body: {}", e.getStatusCode(), e.getResponseBodyAsString());
    return "Unable to process your question right now. Please try again.";
} catch (Exception e) {
    log.error("Gemini API call failed: {}", e.getMessage(), e);
    return "Unable to process your question right now. Please try again.";
}
    }
    
}
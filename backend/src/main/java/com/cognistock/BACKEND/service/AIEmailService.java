package com.cognistock.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class AIEmailService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AIEmailService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        this.restTemplate = new RestTemplate(factory);
    }

    public String generatePurchaseOrderEmail(String productName, int quantity, String supplierName, int deliveryDays, double pricePerUnit) {

        String prompt = String.format(
            "Write a short, professional purchase order email to a supplier. " +
            "Product: %s, Quantity needed: %d units, Supplier: %s, Expected delivery: %d days, Price: ₹%.2f per unit. " +
            "Keep it under 100 words, professional tone, include a subject line.",
            productName, quantity, supplierName, deliveryDays, pricePerUnit
        );

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=" + apiKey;

        Map<String, Object> requestBody = Map.of(
            "contents", new Object[]{
                Map.of("parts", new Object[]{ Map.of("text", prompt) })
            }
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            String response = restTemplate.postForObject(url, entity, String.class);
            JsonNode root = objectMapper.readTree(response);
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        } catch (Exception e) {
            return fallbackEmail(productName, quantity, supplierName, deliveryDays, pricePerUnit);
        }
    }

    private String fallbackEmail(String productName, int quantity, String supplierName, int deliveryDays, double pricePerUnit) {
        return String.format(
            "Subject: Purchase Order Request - %s\n\n" +
            "Dear %s,\n\n" +
            "We would like to place an order for %d units of %s at ₹%.2f per unit. " +
            "Please confirm availability and expected delivery within %d days.\n\n" +
            "Regards,\nCogniStock Procurement",
            productName, supplierName, quantity, productName, pricePerUnit, deliveryDays
        );
    }
}
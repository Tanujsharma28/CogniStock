package com.cognistock.backend.controller;

import com.cognistock.backend.entity.Product;
import com.cognistock.backend.repository.ProductRepository;
import com.cognistock.backend.service.AIDecisionLogService;
import com.cognistock.backend.service.PricingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/pricing")
public class PricingController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private PricingService pricingService;

    @Autowired
    private AIDecisionLogService decisionLogService;

    // ─── Existing endpoint ────────────────────────────────────────────────────

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/suggest/{productId}")
    public ResponseEntity<Object> suggestPrice(@PathVariable Long productId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.badRequest().body("Product not found");
        }

        PricingService.PricingSuggestion suggestion = pricingService.calculateSuggestion(product);

        Long logId = null;
        if (suggestion.changePercent != 0) {
            var entry = decisionLogService.log(
                "Pricing Agent",
                "PRICE_CHANGE",
                String.format("Change price from ₹%.2f to ₹%.2f", suggestion.currentPrice, suggestion.suggestedPrice),
                suggestion.reason,
                suggestion.confidenceScore,
                productId,
                null,
                String.format("Estimated %.1f%% margin impact", suggestion.changePercent)
            );
            logId = entry.getId();
        }

        return ResponseEntity.ok(Map.of(
            "logId", logId == null ? -1 : logId,
            "productId", product.getId(),
            "productName", product.getName(),
            "currentPrice", suggestion.currentPrice,
            "suggestedPrice", suggestion.suggestedPrice,
            "changePercent", suggestion.changePercent,
            "reason", suggestion.reason,
            "confidenceScore", suggestion.confidenceScore,
            "confidenceLabel", suggestion.confidenceLabel
        ));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @PostMapping("/apply/{productId}")
    public ResponseEntity<Object> applyPrice(@PathVariable Long productId, @RequestBody Map<String, Double> body) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.badRequest().body("Product not found");
        }

        Double newPrice = body.get("price");
        if (newPrice == null || newPrice <= 0) {
            return ResponseEntity.badRequest().body("Invalid price");
        }

        product.setPrice(newPrice);
        productRepository.save(product);

        return ResponseEntity.ok(product);
    }

    // ─── New: Dead Stock Recovery endpoint ───────────────────────────────────

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @GetMapping("/recovery/{productId}")
    public ResponseEntity<Object> getRecoveryStrategies(@PathVariable Long productId) {
        Product product = productRepository.findById(productId).orElse(null);
        if (product == null) {
            return ResponseEntity.badRequest().body("Product not found");
        }

        PricingService.RecoveryAnalysis analysis = pricingService.calculateRecoveryStrategies(product);

        // Log to AI decision timeline
        decisionLogService.log(
            "Dead Stock Recovery Agent",
            "RECOVERY_ANALYSIS",
            String.format("Recovery analysis for %s — %d units, ₹%.0f capital locked",
                product.getName(), product.getStockQuantity(), analysis.capitalLocked),
            "No sales in last 30 days. Recovery strategies generated.",
            72.0,
            productId,
            null,
            String.format("₹%.0f capital at risk from dead inventory", analysis.capitalLocked)
        );

        return ResponseEntity.ok(analysis);
    }
}
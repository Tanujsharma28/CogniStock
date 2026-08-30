package com.cognistock.backend.service;

import org.springframework.stereotype.Service;

import com.cognistock.backend.entity.Product;

@Service
public class PricingService {

    public static class PricingSuggestion {
        public double currentPrice;
        public double suggestedPrice;
        public double changePercent;
        public String reason;
        public double confidenceScore;
        public String confidenceLabel;

        public PricingSuggestion(double currentPrice, double suggestedPrice, double changePercent, String reason, double confidenceScore) {
            this.currentPrice = currentPrice;
            this.suggestedPrice = suggestedPrice;
            this.changePercent = changePercent;
            this.reason = reason;
            this.confidenceScore = confidenceScore;
            this.confidenceLabel = AIDecisionLogService.labelFor(confidenceScore);
        }
    }

    // ─── Recovery Strategy ────────────────────────────────────────────────────

    public static class RecoveryStrategy {
        public String type;           // DISCOUNT, BUNDLE, LIQUIDATE
        public String label;
        public double suggestedPrice;
        public double discountPercent;
        public int expectedUnitsToMove;
        public double expectedRecovery;
        public double recoveryPercent;  // of capitalLocked
        public String rationale;

        public RecoveryStrategy(String type, String label, double currentPrice,
                                double discountPercent, int totalStock, double capitalLocked,
                                int expectedUnits, String rationale) {
            this.type = type;
            this.label = label;
            this.discountPercent = Math.round(discountPercent * 10.0) / 10.0;
            this.suggestedPrice = Math.round(currentPrice * (1 - discountPercent / 100) * 100.0) / 100.0;
            this.expectedUnitsToMove = expectedUnits;
            this.expectedRecovery = Math.round(this.suggestedPrice * expectedUnits * 100.0) / 100.0;
            this.recoveryPercent = capitalLocked > 0
                ? Math.round((this.expectedRecovery / capitalLocked) * 100.0 * 10.0) / 10.0
                : 0.0;
            this.rationale = rationale;
        }
    }

    public static class RecoveryAnalysis {
        public Long productId;
        public String productName;
        public int currentStock;
        public double currentPrice;
        public double capitalLocked;
        public java.util.List<RecoveryStrategy> strategies;
    }

    public RecoveryAnalysis calculateRecoveryStrategies(Product product) {
        double price = product.getPrice() != null ? product.getPrice() : 0.0;
        int stock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        double capitalLocked = price * stock;

        RecoveryAnalysis analysis = new RecoveryAnalysis();
        analysis.productId = product.getId();
        analysis.productName = product.getName();
        analysis.currentStock = stock;
        analysis.currentPrice = price;
        analysis.capitalLocked = Math.round(capitalLocked * 100.0) / 100.0;

        analysis.strategies = java.util.List.of(

            // Strategy 1 — Clearance Discount (30%)
            new RecoveryStrategy(
                "DISCOUNT",
                "Clearance Discount",
                price,
                30.0,
                stock,
                capitalLocked,
                stock,  // move all units
                String.format(
                    "30%% discount reduces price from ₹%.0f to ₹%.0f. " +
                    "Aggressive pricing to stimulate demand and clear all %d units quickly.",
                    price, price * 0.70, stock)
            ),

            // Strategy 2 — Bundle Deal (20%)
            new RecoveryStrategy(
                "BUNDLE",
                "Bundle Deal",
                price,
                20.0,
                stock,
                capitalLocked,
                stock / 2,  // move ~half units
                String.format(
                    "20%% bundle discount to ₹%.0f. " +
                    "Pair with a fast-moving product to move ~%d units without deep discounting.",
                    price * 0.80, stock / 2)
            ),

            // Strategy 3 — Liquidation (50%)
            new RecoveryStrategy(
                "LIQUIDATE",
                "Liquidation",
                price,
                50.0,
                stock,
                capitalLocked,
                stock,  // move all units
                String.format(
                    "50%% liquidation price at ₹%.0f. " +
                    "Frees capital immediately at a loss. Use only if storage cost exceeds recovery value.",
                    price * 0.50)
            )
        );

        return analysis;
    }

    // ─── Existing pricing logic (unchanged) ──────────────────────────────────

    public PricingSuggestion calculateSuggestion(Product product) {
        double currentPrice = product.getPrice();
        int stock = product.getStockQuantity();
        int threshold = product.getReorderThreshold();

        double changePercent;
        String reason;

        if (threshold <= 0) {
            changePercent = 0;
            reason = "Reorder threshold not set — no pricing signal available.";
        } else {
            double stockRatio = (double) stock / threshold;

            if (stockRatio <= 1.0) {
                double intensity = Math.min(1.0, (1.0 - stockRatio));
                changePercent = 5 + (intensity * 10);
                reason = String.format(
                    "Stock (%d units) is at or below reorder threshold (%d). Low availability supports a price increase.",
                    stock, threshold
                );
            } else if (stockRatio >= 5.0) {
                double intensity = Math.min(1.0, (stockRatio - 5.0) / 5.0);
                changePercent = -(5 + (intensity * 15));
                reason = String.format(
                    "Stock (%d units) is %.1fx the reorder threshold (%d). Overstock supports a discount to move inventory.",
                    stock, stockRatio, threshold
                );
            } else {
                changePercent = 0;
                reason = "Stock levels are within a healthy range. No price change recommended.";
            }
        }

        double suggestedPrice = currentPrice * (1 + changePercent / 100);
        suggestedPrice = Math.round(suggestedPrice * 100.0) / 100.0;

        double confidence = changePercent == 0 ? 40 : Math.min(95, 55 + Math.abs(changePercent) * 2);

        return new PricingSuggestion(currentPrice, suggestedPrice, Math.round(changePercent * 10.0) / 10.0, reason, confidence);
    }
}
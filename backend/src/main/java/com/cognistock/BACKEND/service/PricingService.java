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
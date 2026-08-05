package com.cognistock.backend.service;

import com.cognistock.backend.entity.Supplier;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class SupplierScoringService {

    public Supplier findBestSupplier(List<Supplier> suppliers) {
        return suppliers.stream()
            .max(Comparator.comparingDouble(this::calculateScore))
            .orElse(null);
    }

    private double calculateScore(Supplier supplier) {
        double deliverySpeedScore = 10.0 / (supplier.getDeliveryDays() != null ? supplier.getDeliveryDays() : 10);
        double priceScore = 1000.0 / (supplier.getPricePerUnit() != null ? supplier.getPricePerUnit() : 1000);
        double reliabilityScore = supplier.getReliabilityScore() != null ? supplier.getReliabilityScore() : 0;

        return (deliverySpeedScore * 0.3) + (priceScore * 0.3) + (reliabilityScore * 0.4);
    }
}
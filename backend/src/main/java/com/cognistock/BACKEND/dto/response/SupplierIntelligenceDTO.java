package com.cognistock.backend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SupplierIntelligenceDTO {
    private Long   supplierId;
    private String name;
    private Integer deliveryDays;
    private Double  pricePerUnit;
    private Double  reliabilityScore;
    private long    totalOrders;
    private long    receivedOrders;
    private long    pendingOrders;
    private long    cancelledOrders;
    private Double  onTimeRate;
    private String  riskLevel;
    private String  aiRecommendation;
}
package com.cognistock.backend.dto.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ProductResponse {

    private Long id;
    private String sku;
    private String name;
    private Integer stockQuantity;
    private Integer reorderThreshold;
    private Double price;
    private String stockStatus;       // HEALTHY, LOW, CRITICAL, OUT_OF_STOCK
    private Boolean belowThreshold;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
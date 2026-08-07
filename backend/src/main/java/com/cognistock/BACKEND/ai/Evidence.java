package com.cognistock.backend.ai;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class Evidence {
    private String source;    // "SalesRecord", "Product", "Order"
    private String metric;    // "deadStockCount"
    private String value;     // "9"
    private String description; // "9 products with zero sales in 30 days"
}
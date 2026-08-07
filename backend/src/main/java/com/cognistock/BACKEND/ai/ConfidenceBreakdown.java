package com.cognistock.backend.ai;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConfidenceBreakdown {
    private double inventory;   // 0-100
    private double sales;       // 0-100
    private double supplier;    // 0-100
    private double forecast;    // 0-100
    private double overall;     // weighted average
    private String note;        // DATA_GAP explanation if any
}
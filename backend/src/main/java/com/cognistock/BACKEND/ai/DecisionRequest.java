package com.cognistock.backend.ai;

import lombok.Data;

@Data
public class DecisionRequest {
    private String problemStatement;
    private String rootCause;
    private String recommendedAction;
    private String domain;         // INVENTORY, SALES, SUPPLIER
    private String priority;       // HIGH, MEDIUM, LOW
    private String requestedBy;
}
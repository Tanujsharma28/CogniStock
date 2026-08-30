package com.cognistock.backend.ai.orchestrator;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class BusinessEvent {
    public enum EventType {
        INVENTORY_CHANGE, SALES_RECORD, ORDER_CREATED,
        ORDER_APPROVED, ORDER_REJECTED, SUPPLIER_UPDATE,
        MANUAL_TRIGGER, SCHEDULED_TRIGGER
    }

    private EventType type;
    private String triggeredBy;
    private String resourceId;
    private String resourceType;
    private Map<String, Object> payload;
    private LocalDateTime occurredAt;
}
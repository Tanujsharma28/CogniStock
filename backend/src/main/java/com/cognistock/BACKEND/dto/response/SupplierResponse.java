package com.cognistock.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class SupplierResponse {
    private Long id;
    private String name;
    private String contactPerson;
    private String email;
    private String phone;
    private String address;
    private Integer deliveryDays;
    private Double pricePerUnit;
    private Double reliabilityScore;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
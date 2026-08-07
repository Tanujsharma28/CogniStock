package com.cognistock.backend.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class SalesRecordRequest {

    @NotNull(message = "Product ID is required")
    private Long productId;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantitySold;

    @NotNull(message = "Sale date is required")
    private LocalDate saleDate;

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be positive")
    private Double unitPrice;

    private String channel; // ONLINE, OFFLINE, B2B

    private String notes;
}
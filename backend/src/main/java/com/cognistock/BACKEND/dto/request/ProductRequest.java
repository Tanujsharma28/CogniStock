package com.cognistock.backend.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ProductRequest {

    @NotBlank(message = "SKU is required")
    @Size(min = 2, max = 20, message = "SKU must be 2-20 characters")
    private String sku;

    @NotBlank(message = "Product name is required")
    @Size(min = 2, max = 100, message = "Name must be 2-100 characters")
    private String name;

    @NotNull(message = "Stock quantity is required")
    @Min(value = 0, message = "Stock cannot be negative")
    private Integer stockQuantity;

    @NotNull(message = "Reorder threshold is required")
    @Min(value = 1, message = "Reorder threshold must be at least 1")
    private Integer reorderThreshold;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    private Double price;
}
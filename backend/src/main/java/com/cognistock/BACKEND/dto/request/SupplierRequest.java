package com.cognistock.backend.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class SupplierRequest {

    @NotBlank(message = "Supplier name is required")
    private String name;

    @NotBlank(message = "Contact person is required")
    private String contactPerson;

    @Email(message = "Valid email is required")
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^[0-9+\\-\\s]{7,15}$", message = "Invalid phone number")
    private String phone;

    @NotBlank(message = "Address is required")
    private String address;

    @Min(value = 0, message = "Delivery days cannot be negative")
    private Integer deliveryDays;

    @Min(value = 0, message = "Price per unit cannot be negative")
    private Double pricePerUnit;

    @Min(value = 0, message = "Reliability score cannot be negative")
    @Max(value = 100, message = "Reliability score must be <= 100")
    private Double reliabilityScore;
}
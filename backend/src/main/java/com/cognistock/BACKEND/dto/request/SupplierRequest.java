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
}
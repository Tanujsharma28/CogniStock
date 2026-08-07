package com.cognistock.backend.controller;
import com.cognistock.backend.entity.Order;
import com.cognistock.backend.common.ApiConstants;
import com.cognistock.backend.common.ApiResponse;
import com.cognistock.backend.dto.request.OrderRequest;
import com.cognistock.backend.dto.response.OrderResponse;
import com.cognistock.backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getAll() {
        return ResponseEntity.ok(
            ApiResponse.success(orderService.getAllOrders(), ApiConstants.FETCHED));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'STAFF')")
    public ResponseEntity<ApiResponse<OrderResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(
            ApiResponse.success(orderService.getById(id), ApiConstants.FETCHED));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<OrderResponse>> create(
            @Valid @RequestBody OrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
            ApiResponse.success(orderService.create(request), ApiConstants.CREATED));
    }

    @PatchMapping("/{id}/status")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public ResponseEntity<ApiResponse<OrderResponse>> updateStatus(
        @PathVariable Long id, @RequestParam String status) {
    return ResponseEntity.ok(
        ApiResponse.success(
            orderService.updateStatus(id, Order.OrderStatus.valueOf(status.toUpperCase())),
            ApiConstants.UPDATED));
}
}
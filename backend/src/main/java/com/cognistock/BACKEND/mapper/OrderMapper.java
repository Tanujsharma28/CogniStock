package com.cognistock.backend.mapper;

import com.cognistock.backend.dto.response.OrderResponse;
import com.cognistock.backend.dto.response.OrderResponse.OrderItemResponse;
import com.cognistock.backend.entity.Order;
import com.cognistock.backend.entity.OrderItem;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface OrderMapper {

    @Mapping(target = "supplierId", source = "supplier.id")
    @Mapping(target = "supplierName", source = "supplier.name")
    OrderResponse toResponse(Order order);

    @Mapping(target = "productId", source = "product.id")
    @Mapping(target = "productName", source = "product.name")
    OrderItemResponse toItemResponse(OrderItem item);
}
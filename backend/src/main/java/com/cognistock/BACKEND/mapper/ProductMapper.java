package com.cognistock.backend.mapper;

import com.cognistock.backend.dto.request.ProductRequest;
import com.cognistock.backend.dto.response.ProductResponse;
import com.cognistock.backend.entity.Product;
import org.mapstruct.*;

@Mapper(componentModel = "spring")
public interface ProductMapper {

    // Request → Entity
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Product toEntity(ProductRequest request);

    // Entity → Response
    @Mapping(target = "stockStatus", expression = "java(resolveStockStatus(product))")
    @Mapping(target = "belowThreshold", expression = "java(product.getStockQuantity() != null && product.getReorderThreshold() != null && product.getStockQuantity() <= product.getReorderThreshold())")
    ProductResponse toResponse(Product product);

    // Update existing entity from request
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "sku", ignore = true)  // SKU change nahi hoga update pe
    void updateEntity(ProductRequest request, @MappingTarget Product product);

    default String resolveStockStatus(Product product) {
        if (product.getStockQuantity() == null || product.getReorderThreshold() == null) {
            return "UNKNOWN";
        }
        if (product.getStockQuantity() == 0) return "OUT_OF_STOCK";
        if (product.getStockQuantity() <= product.getReorderThreshold() / 2) return "CRITICAL";
        if (product.getStockQuantity() <= product.getReorderThreshold()) return "LOW";
        return "HEALTHY";
    }
}
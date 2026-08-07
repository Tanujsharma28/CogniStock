package com.cognistock.backend.mapper;

import com.cognistock.backend.dto.request.SupplierRequest;
import com.cognistock.backend.dto.response.SupplierResponse;
import com.cognistock.backend.entity.Supplier;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface SupplierMapper {

    SupplierResponse toResponse(Supplier supplier);

    Supplier toEntity(SupplierRequest request);

    void updateEntity(SupplierRequest request, @MappingTarget Supplier supplier);
}
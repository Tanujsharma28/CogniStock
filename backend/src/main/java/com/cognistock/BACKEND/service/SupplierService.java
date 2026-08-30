package com.cognistock.backend.service;

import com.cognistock.backend.dto.request.SupplierRequest;
import com.cognistock.backend.dto.response.SupplierResponse;
import com.cognistock.backend.entity.Supplier;
import com.cognistock.backend.exception.ResourceNotFoundException;
import com.cognistock.backend.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public List<SupplierResponse> getAllSuppliers() {
        return supplierRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public SupplierResponse getById(Long id) {
        return toResponse(findOrThrow(id));
    }

    public SupplierResponse create(SupplierRequest request) {
        Supplier supplier = new Supplier();
        mapToEntity(request, supplier);
        Supplier saved = supplierRepository.save(supplier);
        log.info("Supplier created with id: {}", saved.getId());
        return toResponse(saved);
    }

    public SupplierResponse update(Long id, SupplierRequest request) {
        Supplier supplier = findOrThrow(id);
        mapToEntity(request, supplier);
        Supplier updated = supplierRepository.save(supplier);
        log.info("Supplier updated with id: {}", updated.getId());
        return toResponse(updated);
    }

    public void delete(Long id) {
        if (!supplierRepository.existsById(id)) {
            throw new ResourceNotFoundException("Supplier", "id", id);
        }
        supplierRepository.deleteById(id);
        log.info("Supplier deleted with id: {}", id);
    }

    // ---- helpers ----

    private Supplier findOrThrow(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", "id", id));
    }

    private void mapToEntity(SupplierRequest request, Supplier supplier) {
    supplier.setName(request.getName());
    supplier.setContactPerson(request.getContactPerson());
    supplier.setEmail(request.getEmail());
    supplier.setPhone(request.getPhone());
    supplier.setAddress(request.getAddress());
    supplier.setDeliveryDays(request.getDeliveryDays());
    supplier.setPricePerUnit(request.getPricePerUnit());
    supplier.setReliabilityScore(request.getReliabilityScore());
}

    private SupplierResponse toResponse(Supplier supplier) {
    return SupplierResponse.builder()
            .id(supplier.getId())
            .name(supplier.getName())
            .contactPerson(supplier.getContactPerson())
            .email(supplier.getEmail())
            .phone(supplier.getPhone())
            .address(supplier.getAddress())
            .deliveryDays(supplier.getDeliveryDays())
            .pricePerUnit(supplier.getPricePerUnit())
            .reliabilityScore(supplier.getReliabilityScore())
            .createdAt(supplier.getCreatedAt())
            .updatedAt(supplier.getUpdatedAt())
            .build();
}
}
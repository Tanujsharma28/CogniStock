package com.cognistock.backend.repository;

import com.cognistock.backend.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    Optional<Supplier> findFirstByName(String name);
}

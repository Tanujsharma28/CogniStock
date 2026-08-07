package com.cognistock.backend.repository;

import com.cognistock.backend.entity.BusinessMemory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BusinessMemoryRepository extends JpaRepository<BusinessMemory, Long> {
    List<BusinessMemory> findAllByOrderByOccurredAtDesc();
    List<BusinessMemory> findByEventTypeOrderByOccurredAtDesc(String eventType);
}
package com.cognistock.backend.repository;

import com.cognistock.backend.entity.AIPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AIPolicyRepository extends JpaRepository<AIPolicy, Long> {
    Optional<AIPolicy> findTopByOrderByIdAsc();
}
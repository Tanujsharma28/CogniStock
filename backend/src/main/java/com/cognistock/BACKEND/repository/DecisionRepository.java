package com.cognistock.backend.repository;

import com.cognistock.backend.entity.Decision;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DecisionRepository extends JpaRepository<Decision, Long> {
    List<Decision> findByStatusOrderByCreatedAtDesc(String status);
    List<Decision> findByDomainOrderByCreatedAtDesc(String domain);
    List<Decision> findAllByOrderByCreatedAtDesc();
}
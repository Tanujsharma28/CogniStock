package com.cognistock.backend.repository;

import com.cognistock.backend.entity.Decision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface DecisionRepository extends JpaRepository<Decision, Long> {
    List<Decision> findByStatusOrderByCreatedAtDesc(String status);
    List<Decision> findByDomainOrderByCreatedAtDesc(String domain);
    List<Decision> findAllByOrderByCreatedAtDesc();

    @Query("SELECT d.status, COUNT(d) FROM Decision d GROUP BY d.status")
    List<Object[]> countByStatus();
}
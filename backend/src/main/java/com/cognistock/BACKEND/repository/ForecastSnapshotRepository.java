package com.cognistock.backend.repository;

import com.cognistock.backend.entity.ForecastSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ForecastSnapshotRepository extends JpaRepository<ForecastSnapshot, Long> {

    // Duplicate check — same product + same date
    Optional<ForecastSnapshot> findByProductIdAndSnapshotDate(
        Long productId, LocalDate snapshotDate);

    // Accuracy calculate karne ke eligible snapshots:
    // horizon complete ho chuka hai + actual_quantity abhi fill nahi hua
    @Query("SELECT fs FROM ForecastSnapshot fs " +
           "WHERE fs.actualQuantity IS NULL " +
           "AND fs.snapshotDate <= :cutoffDate")
    List<ForecastSnapshot> findEligibleForEvaluation(
        @Param("cutoffDate") LocalDate cutoffDate);

    // Per-product accuracy — sirf evaluated snapshots
    @Query("SELECT fs FROM ForecastSnapshot fs " +
           "WHERE fs.accuracyPercent IS NOT NULL " +
           "ORDER BY fs.snapshotDate DESC")
    List<ForecastSnapshot> findAllEvaluated();

    // Per-product evaluated snapshots
    @Query("SELECT fs FROM ForecastSnapshot fs " +
           "WHERE fs.productId = :productId " +
           "AND fs.accuracyPercent IS NOT NULL " +
           "ORDER BY fs.snapshotDate DESC")
    List<ForecastSnapshot> findEvaluatedByProductId(
        @Param("productId") Long productId);

    // Latest snapshot per product (for display)
    @Query("SELECT fs FROM ForecastSnapshot fs " +
           "WHERE fs.snapshotDate = (" +
           "  SELECT MAX(fs2.snapshotDate) FROM ForecastSnapshot fs2 " +
           "  WHERE fs2.productId = fs.productId" +
           ")")
    List<ForecastSnapshot> findLatestPerProduct();
}
package com.cognistock.backend.repository;

import com.cognistock.backend.entity.SalesRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SalesRecordRepository extends JpaRepository<SalesRecord, Long> {

    // Date range ke andar sales
    List<SalesRecord> findBySaleDateBetweenOrderBySaleDateDesc(
        LocalDate start, LocalDate end);

    // Product ki sales history
    List<SalesRecord> findByProductIdOrderBySaleDateDesc(Long productId);

    // Paginated sales list with Product eagerly joined — avoids N+1 lazy-load
    @Query(
        value = "SELECT s FROM SalesRecord s JOIN FETCH s.product ORDER BY s.saleDate DESC",
        countQuery = "SELECT COUNT(s) FROM SalesRecord s"
    )
    Page<SalesRecord> findAllWithProduct(Pageable pageable);

    // Total revenue by date range
    @Query("SELECT COALESCE(SUM(s.totalRevenue), 0) FROM SalesRecord s " +
           "WHERE s.saleDate BETWEEN :start AND :end")
    Double getTotalRevenueBetween(
        @Param("start") LocalDate start,
        @Param("end") LocalDate end);

    // Top selling products
    @Query("SELECT s.product.id, s.product.name, SUM(s.quantitySold) as totalQty, " +
           "SUM(s.totalRevenue) as totalRev " +
           "FROM SalesRecord s " +
           "WHERE s.saleDate BETWEEN :start AND :end " +
           "GROUP BY s.product.id, s.product.name " +
           "ORDER BY totalQty DESC")
    List<Object[]> getTopProductsBetween(
        @Param("start") LocalDate start,
        @Param("end") LocalDate end);

    // Daily revenue trend
    @Query("SELECT s.saleDate, SUM(s.totalRevenue) " +
           "FROM SalesRecord s " +
           "WHERE s.saleDate BETWEEN :start AND :end " +
           "GROUP BY s.saleDate " +
           "ORDER BY s.saleDate ASC")
    List<Object[]> getDailyRevenueTrend(
        @Param("start") LocalDate start,
        @Param("end") LocalDate end);

    // Monthly revenue
    @Query("SELECT YEAR(s.saleDate), MONTH(s.saleDate), SUM(s.totalRevenue) " +
           "FROM SalesRecord s " +
           "GROUP BY YEAR(s.saleDate), MONTH(s.saleDate) " +
           "ORDER BY YEAR(s.saleDate) DESC, MONTH(s.saleDate) DESC")
    List<Object[]> getMonthlyRevenue();

    // Dead stock check — products with no sales in last N days
    @Query("SELECT p FROM Product p WHERE p.id NOT IN " +
           "(SELECT DISTINCT s.product.id FROM SalesRecord s " +
           "WHERE s.saleDate >= :since)")
    List<com.cognistock.backend.entity.Product> findDeadStockSince(
        @Param("since") LocalDate since);

    // Batch fetch — sales records for multiple products in one query
    List<SalesRecord> findByProductIdInOrderBySaleDateDesc(List<Long> productIds);
}
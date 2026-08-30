package com.cognistock.backend.repository;

import com.cognistock.backend.entity.Order;
import com.cognistock.backend.entity.Order.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    @Query("SELECT o FROM Order o WHERE o.supplier.id = :supplierId")
    List<Order> findBySupplierId(@Param("supplierId") Long supplierId);

    @Query("SELECT o FROM Order o WHERE o.supplier.id = :supplierId AND o.status = :status")
    List<Order> findBySupplierIdAndStatus(
        @Param("supplierId") Long supplierId,
        @Param("status") OrderStatus status);

       @Query("SELECT DISTINCT o.supplier FROM Order o " +
       "JOIN o.items i " +
       "WHERE i.product.id = :productId " +
       "AND o.status IN ('RECEIVED', 'APPROVED', 'PENDING')")
List<com.cognistock.backend.entity.Supplier> findSuppliersByProductId(
    @Param("productId") Long productId);

    // ── Batch fetch: all orders for all suppliers ─────────────────────────────
    // Replaces N×findBySupplierId calls in SupplierIntelligenceService
    @Query("SELECT o FROM Order o JOIN FETCH o.supplier")
    List<Order> findAllWithSupplier();

    // ── Batch fetch: product → supplier mappings for all products ─────────────
    // Replaces per-product findSuppliersByProductId calls
    @Query("SELECT DISTINCT i.product.id, o.supplier FROM Order o " +
           "JOIN o.items i " +
           "WHERE o.status IN ('RECEIVED', 'APPROVED', 'PENDING')")
    List<Object[]> findProductSupplierMappings();
}